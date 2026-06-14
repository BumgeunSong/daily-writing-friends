import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';

const USER_URL = `${SUPABASE_URL}/auth/v1/user`;
const TOKEN_URL = `${SUPABASE_URL}/auth/v1/token`;
const LOGOUT_URL = `${SUPABASE_URL}/auth/v1/logout`;

let signedInUserId: string | null = null;

export function resetAuthHandlerState(): void {
  signedInUserId = null;
}

export function userIdFromEmail(email: string): string {
  return email.split('@')[0];
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

function passwordGrantSession(userId: string, email: string) {
  return HttpResponse.json({
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: 'test-refresh-token',
    user: { id: userId, email },
  });
}

function userResponse(userId: string) {
  return HttpResponse.json({ id: userId, email: `${userId}@test.local` });
}

export const authHandlers = [
  http.get(USER_URL, () => (signedInUserId ? userResponse(signedInUserId) : unauthorized())),

  http.post(TOKEN_URL, async ({ request }) => {
    if (new URL(request.url).searchParams.get('grant_type') !== 'password') {
      return new HttpResponse(null, { status: 400 });
    }
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    if (typeof body.email !== 'string' || !body.email.includes('@')) {
      return invalidGrant('email required');
    }
    if (typeof body.password !== 'string' || body.password.length === 0) {
      return invalidGrant('password required');
    }
    const userId = userIdFromEmail(body.email);
    signedInUserId = userId;
    return passwordGrantSession(userId, body.email);
  }),

  http.post(LOGOUT_URL, () => {
    signedInUserId = null;
    return new HttpResponse(null, { status: 204 });
  }),
];
