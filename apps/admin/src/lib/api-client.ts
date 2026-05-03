import { auth } from './firebase';

export type AdminApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'rate-limited'
  | 'bad-request'
  | 'server-error';

export type AdminApiErrorBody = {
  error: string;
  code: AdminApiErrorCode;
};

export class AdminApiClientError extends Error {
  readonly status: number;
  readonly code: AdminApiErrorCode;
  readonly body?: AdminApiErrorBody;
  constructor(status: number, message: string, code: AdminApiErrorCode, body?: AdminApiErrorBody) {
    super(message);
    this.name = 'AdminApiClientError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

export class AdminAccessError extends AdminApiClientError {
  constructor(body?: AdminApiErrorBody) {
    super(403, 'Your account does not have admin access.', 'forbidden', body);
    this.name = 'AdminAccessError';
  }
}

export class RateLimitError extends AdminApiClientError {
  readonly retryAfterSeconds: number;
  constructor(retryAfterSeconds: number, body?: AdminApiErrorBody) {
    super(429, `Too many requests — retry in ${retryAfterSeconds}s.`, 'rate-limited', body);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const DEFAULT_RETRY_AFTER_SECONDS = 30;

const SIGN_IN_REDIRECT_PATH = '/login';

let redirectFn: () => void = () => {
  if (typeof window !== 'undefined') {
    window.location.assign(SIGN_IN_REDIRECT_PATH);
  }
};

/** Test seam: replace the redirect function in tests. */
export function __setRedirectForTests(fn: () => void): void {
  redirectFn = fn;
}

const TOKEN_REFRESH_THRESHOLD_SECONDS = 30;

/**
 * Decodes a JWT's payload (without verification — purely to read the `exp` claim
 * for client-side scheduling). Returns null on any parse error so callers can
 * fall back to the regular `getIdToken()` path.
 */
function readExpFromJwt(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    // base64url -> base64 -> JSON
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '==='.slice((b64.length + 3) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

async function getIdToken(forceRefresh: boolean): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new AdminApiClientError(401, 'Not signed in.', 'unauthorized');
  }
  if (forceRefresh) {
    return user.getIdToken(true);
  }
  // Proactive refresh: peek at the cached token's `exp` and force-refresh when
  // within TOKEN_REFRESH_THRESHOLD_SECONDS. Avoids the 401-then-retry round-trip
  // when a request lands on a token that is about to expire.
  const cached = await user.getIdToken(false);
  const exp = readExpFromJwt(cached);
  if (exp !== null) {
    const nowSec = Math.floor(Date.now() / 1000);
    if (exp - nowSec < TOKEN_REFRESH_THRESHOLD_SECONDS) {
      return user.getIdToken(true);
    }
  }
  return cached;
}

function parseRetryAfter(headers: Headers): number {
  const raw = headers.get('Retry-After');
  if (!raw) return DEFAULT_RETRY_AFTER_SECONDS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_RETRY_AFTER_SECONDS;
  return parsed;
}

async function readErrorBody(res: Response): Promise<AdminApiErrorBody | undefined> {
  try {
    const body = (await res.json()) as Partial<AdminApiErrorBody>;
    if (typeof body?.error === 'string' && typeof body?.code === 'string') {
      return body as AdminApiErrorBody;
    }
  } catch {
    // not JSON; fall through
  }
  return undefined;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return (await res.json()) as T;
  }
  const body = await readErrorBody(res);
  if (res.status === 403) {
    throw new AdminAccessError(body);
  }
  if (res.status === 429) {
    throw new RateLimitError(parseRetryAfter(res.headers), body);
  }
  if (res.status === 401) {
    throw new AdminApiClientError(401, body?.error ?? 'Unauthorized.', 'unauthorized', body);
  }
  if (res.status === 400 || res.status === 404) {
    throw new AdminApiClientError(res.status, body?.error ?? 'Bad request.', 'bad-request', body);
  }
  throw new AdminApiClientError(
    res.status,
    body?.error ?? `Request failed with status ${res.status}.`,
    'server-error',
    body,
  );
}

export type AdminFetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>;
};

export async function adminFetch<T>(path: string, options: AdminFetchOptions = {}): Promise<T> {
  const send = async (token: string): Promise<Response> => {
    return fetch(path, {
      ...options,
      headers: {
        ...(options.headers ?? {}),
        Authorization: `Bearer ${token}`,
        ...(options.body && !options.headers?.['Content-Type']
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
    });
  };

  let token: string;
  try {
    token = await getIdToken(false);
  } catch (e) {
    if (e instanceof AdminApiClientError && e.status === 401) {
      redirectFn();
    }
    throw e;
  }

  let res = await send(token);

  if (res.status === 401) {
    let refreshed: string;
    try {
      refreshed = await getIdToken(true);
    } catch {
      redirectFn();
      throw new AdminApiClientError(
        401,
        'Session expired. Redirecting to sign-in.',
        'unauthorized',
      );
    }
    res = await send(refreshed);
    if (res.status === 401) {
      redirectFn();
      throw new AdminApiClientError(
        401,
        'Session expired after refresh. Redirecting to sign-in.',
        'unauthorized',
      );
    }
  }

  return handleResponse<T>(res);
}

export function adminGet<T>(path: string): Promise<T> {
  return adminFetch<T>(path, { method: 'GET' });
}

export function adminPost<TResp, TBody = unknown>(path: string, body?: TBody): Promise<TResp> {
  return adminFetch<TResp>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
