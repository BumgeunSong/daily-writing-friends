/**
 * Browser-side Supabase Client
 *
 * Singleton pattern with lazy initialization.
 */

import { createClient } from '@supabase/supabase-js';
import type { PostgrestError , SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get the singleton Supabase client instance.
 * Lazily initialized on first call.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const rawUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!rawUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
    );
  }

  // Normalize URL: add protocol if missing (http for localhost, https otherwise)
  let supabaseUrl: string;
  if (/^https?:\/\//i.test(rawUrl)) {
    supabaseUrl = rawUrl;
  } else if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(rawUrl)) {
    supabaseUrl = `http://${rawUrl}`;
  } else {
    supabaseUrl = `https://${rawUrl}`;
  }

  const isLocal = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: isLocal
      ? {
          // Local dev: enable auth for LLM testing with email/password
          autoRefreshToken: true,
          persistSession: true,
        }
      : {
          autoRefreshToken: false,
          persistSession: false,
        },
  });

  return supabaseInstance;
}

export class SupabaseWriteError extends Error {
  constructor(public readonly postgrestError: PostgrestError) {
    super(`Supabase write error: ${postgrestError.message} (code: ${postgrestError.code}, details: ${postgrestError.details})`);
    this.name = 'SupabaseWriteError';
  }
}

/** Execute a Supabase operation and throw on error */
export function throwOnError(result: { error: PostgrestError | null }): void {
  if (result.error) {
    throw new SupabaseWriteError(result.error);
  }
}
