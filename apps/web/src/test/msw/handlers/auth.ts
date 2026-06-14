import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';

let signedInUserId: string | null = null;

export function resetAuthHandlerState(): void {
  signedInUserId = null;
}

export function setSignedInUser(userId: string | null): void {
  signedInUserId = userId;
}

export const authHandlers = [
  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    if (!signedInUserId) {
      return new HttpResponse(null, { status: 401 });
    }
    return HttpResponse.json({ id: signedInUserId, email: `${signedInUserId}@test.local` });
  }),

  http.post(`${SUPABASE_URL}/auth/v1/token`, async ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('grant_type') === 'password') {
      const body = (await request.json()) as { email?: string };
      const userId = body.email?.split('@')[0] ?? 'test-user';
      signedInUserId = userId;
      return HttpResponse.json({
        access_token: 'test-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'test-refresh-token',
        user: { id: userId, email: body.email },
      });
    }
    return new HttpResponse(null, { status: 400 });
  }),

  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    signedInUserId = null;
    return new HttpResponse(null, { status: 204 });
  }),
];
