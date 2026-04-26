import fs from 'fs/promises';

/**
 * Shared Supabase authentication utilities for E2E tests.
 * Used by both auth.setup.ts (setup project) and fixtures/auth.ts (runtime fixtures).
 */

/**
 * Extract project ref from Supabase URL for localStorage key.
 *
 * This mirrors what the Supabase JS SDK does internally:
 * it takes `new URL(url).hostname.split('.')[0]` as the project ref.
 *
 * Examples:
 *  - http://127.0.0.1:54321  -> "127"    (local Supabase CLI)
 *  - https://abcdefgh.supabase.co -> "abcdefgh"
 */
export function extractProjectRef(url: string): string {
  return new URL(url).hostname.split('.')[0];
}

/**
 * Read environment variables for Supabase auth, with fallbacks for local dev.
 */
export function getSupabaseEnv() {
  const isProduction = process.env.E2E_ENV === 'production';

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    (isProduction ? '' : 'http://127.0.0.1:54321');

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL');
  }

  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    (isProduction ? '' : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0');

  if (!anonKey) {
    throw new Error('Missing SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY');
  }

  const baseURL = process.env.E2E_BASE_URL || process.env.BASE_URL || 'http://localhost:5174';

  return { supabaseUrl, anonKey, baseURL };
}

/**
 * Authenticate a user via Supabase GoTrue REST API (Node-side, no browser).
 * Returns the raw session object from GoTrue.
 */
export async function authenticateViaRest(
  supabaseUrl: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: { id: string; email: string; [key: string]: unknown };
}> {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify({ email, password }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Auth failed (${response.status}): ${body}`);
  }

  return response.json();
}

/**
 * Derive the Supabase localStorage key for a given Supabase URL.
 * Mirrors the pattern used by the Supabase JS SDK.
 */
export function getStorageKey(supabaseUrl: string): string {
  return `sb-${extractProjectRef(supabaseUrl)}-auth-token`;
}

/**
 * Build a Playwright-compatible storageState object with Supabase session tokens.
 */
export function buildStorageState(
  supabaseUrl: string,
  baseURL: string,
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    user: { id: string; email: string; [key: string]: unknown };
  },
) {
  const storageKey = getStorageKey(supabaseUrl);

  const storageValue = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: Math.floor(Date.now() / 1000) + session.expires_in,
    token_type: session.token_type,
    user: session.user,
  });

  return {
    cookies: [],
    origins: [
      {
        origin: baseURL,
        localStorage: [{ name: storageKey, value: storageValue }],
      },
    ],
  };
}

/**
 * Full flow: authenticate via REST and write storageState.auth.json to disk.
 * Used by auth.setup.ts.
 */
export async function authenticateAndSaveState(
  email: string,
  password: string,
  outputPath: string,
): Promise<void> {
  const { supabaseUrl, anonKey, baseURL } = getSupabaseEnv();

  console.log(`Authenticating ${email} against ${supabaseUrl}...`);
  const session = await authenticateViaRest(supabaseUrl, anonKey, email, password);
  console.log(`Authenticated as ${session.user.email} (${session.user.id})`);

  const storageState = buildStorageState(supabaseUrl, baseURL, session);
  await fs.writeFile(outputPath, JSON.stringify(storageState, null, 2));
  console.log(`Auth state saved to ${outputPath}`);
}
