const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const TOKEN_URL = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

/**
 * Drive the MSW auth handler's password-grant path so subsequent calls to
 * `GET /auth/v1/user` return the signed-in session. Use this in integration
 * tests where the seam under test INCLUDES the auth boundary (e.g. protected
 * routes, loader-driven pages).
 *
 * When the seam is downstream of auth (form callbacks, presentational
 * components), prefer `vi.mock('@/shared/hooks/useAuth')` — see the
 * `integration-testing` skill for the policy.
 */
export async function signInAs(email: string): Promise<void> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'pw' }),
  });
  if (!res.ok) {
    throw new Error(`signInAs failed: ${res.status}`);
  }
}
