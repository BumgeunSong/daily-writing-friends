import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';

const USER_URL = `${SUPABASE_URL}/auth/v1/user`;
const TOKEN_URL = `${SUPABASE_URL}/auth/v1/token`;
const LOGOUT_URL = `${SUPABASE_URL}/auth/v1/logout`;

export interface AuthSession {
  readonly userId: string;
  readonly email: string;
}

let session: AuthSession | null = null;

function setSession(next: AuthSession | null): void {
  session = next;
}

export function resetAuthHandlerState(): void {
  setSession(null);
}

export function testEmailFor(userId: string): string {
  return `${userId}@test.local`;
}

export function userIdFromEmail(email: string): string {
  const localPart = email.split('@')[0];
  if (!localPart) {
    throw new Error(`userIdFromEmail: empty local-part in "${email}"`);
  }
  return localPart;
}

/**
 * Single, validating constructor for `AuthSession`. Locks the cross-field
 * invariant `userId === userIdFromEmail(email)` so a future handler can't
 * accidentally produce `{ userId: 'alice', email: 'bob@…' }` and silently
 * desync the `GET /auth/v1/user` response from the password-grant body.
 */
export function authSessionFromEmail(email: string): AuthSession {
  return { userId: userIdFromEmail(email), email };
}

function isValidEmailLike(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const at = value.indexOf('@');
  return at > 0;
}

function unauthorized() {
  return new HttpResponse(null, { status: 401 });
}

function invalidGrant(description: string) {
  return HttpResponse.json(
    { error: 'invalid_grant', error_description: description },
    { status: 400 },
  );
}

function passwordGrantSession({ userId, email }: AuthSession) {
  return HttpResponse.json({
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'test-refresh-token',
    user: { id: userId, email },
  });
}

function userResponse({ userId, email }: AuthSession) {
  return HttpResponse.json({ id: userId, email });
}

export const authHandlers = [
  http.get(USER_URL, () => (session ? userResponse(session) : unauthorized())),

  http.post(TOKEN_URL, async ({ request }) => {
    if (new URL(request.url).searchParams.get('grant_type') !== 'password') {
      return new HttpResponse(null, { status: 400 });
    }
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    if (!isValidEmailLike(body.email)) {
      return invalidGrant('email required');
    }
    if (typeof body.password !== 'string' || body.password.length === 0) {
      return invalidGrant('password required');
    }
    const next = authSessionFromEmail(body.email);
    setSession(next);
    return passwordGrantSession(next);
  }),

  http.post(LOGOUT_URL, () => {
    setSession(null);
    return new HttpResponse(null, { status: 204 });
  }),
];
