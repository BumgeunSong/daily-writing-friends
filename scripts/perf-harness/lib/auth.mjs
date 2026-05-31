// Authenticate the frozen-fixture member against local Supabase and produce the
// exact localStorage entry the app's supabase-js client expects.
// Supabase stores the session in localStorage (not cookies), so injecting this
// key is what makes both Lighthouse and Playwright see an authenticated app.

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
  storageKeyFor,
} from './config.mjs';

/** POST /auth/v1/token?grant_type=password -> session. */
export async function authenticate() {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ email: MEMBER_EMAIL, password: MEMBER_PASSWORD }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Auth failed (${res.status}) for ${MEMBER_EMAIL}: ${body.slice(0, 300)}`,
    );
  }
  return res.json();
}

/** localStorage { name, value } pair for the supabase-js session. */
export function sessionStorageEntry(session) {
  const expiresAt = Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600);
  const value = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: expiresAt,
    token_type: session.token_type ?? 'bearer',
    user: session.user,
  });
  return { name: storageKeyFor(), value };
}

/** Playwright storageState injecting the session at the given origin. */
export function storageState(origin, session) {
  return {
    cookies: [],
    origins: [{ origin, localStorage: [sessionStorageEntry(session)] }],
  };
}
