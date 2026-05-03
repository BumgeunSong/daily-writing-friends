import 'server-only';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;

  // Strict server-only boundary: do NOT fall back to NEXT_PUBLIC_SUPABASE_URL.
  // The fallback would mask a missing server-only env var by silently using a
  // client-scoped one (Phase 3 plans to remove NEXT_PUBLIC_SUPABASE_URL entirely).
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "SUPABASE_URL is not configured. Set it on the admin app's Vercel project (server-only).",
    );
  }
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. Set it on the admin app's Vercel project (server-only).",
    );
  }

  cachedClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}
