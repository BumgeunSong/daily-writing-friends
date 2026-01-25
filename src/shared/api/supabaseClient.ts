/**
 * Browser-side Supabase Client
 *
 * Singleton pattern with lazy initialization for use during dual-write migration.
 * Uses anon key for public writes during the migration period.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get the singleton Supabase client instance.
 * Lazily initialized on first call.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // No auth during migration - using anon key for writes
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseInstance;
}

/**
 * Check if dual-write is enabled via feature flag.
 */
export function isDualWriteEnabled(): boolean {
  return import.meta.env.VITE_DUAL_WRITE_ENABLED === 'true';
}

/**
 * Read source for gradual migration.
 * - 'firestore': Read from Firestore (current behavior)
 * - 'supabase': Read from Supabase
 * - 'shadow': Read from both, compare, return Firestore result
 */
export type ReadSource = 'firestore' | 'supabase' | 'shadow';

export function getReadSource(): ReadSource {
  const source = import.meta.env.VITE_READ_SOURCE;
  if (source === 'supabase' || source === 'shadow') {
    return source;
  }
  return 'firestore'; // Default to Firestore during migration
}
