/**
 * Browser-side Supabase Client
 *
 * Singleton pattern with lazy initialization.
 */

import { createClient } from '@supabase/supabase-js';
import type { PostgrestError , SupabaseClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react';
import { addSentryBreadcrumb } from '@/sentry';

const SLOW_WRITE_THRESHOLD_MS = 1000;

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

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
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

/** Execute a Supabase operation and throw on error, reporting to Sentry if an error occurs */
export function throwOnError(
  result: { error: PostgrestError | null },
  operation?: string,
): void {
  if (result.error) {
    const writeError = new SupabaseWriteError(result.error);

    addSentryBreadcrumb(
      operation ? `Supabase write failed: ${operation}` : 'Supabase write failed',
      'supabase.write',
      {
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
        operation,
      },
      'error',
    );

    Sentry.withScope((scope) => {
      scope.setContext('supabaseError', {
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
        hint: result.error.hint,
        operation,
      });
      if (result.error.code === '42501') {
        scope.setFingerprint(['supabase', 'permission-denied', operation ?? 'unknown']);
      }
      Sentry.captureException(writeError);
    });

    throw writeError;
  }
}

/**
 * Execute a tracked Supabase write operation with timing, slow-query detection, and Sentry breadcrumbs.
 *
 * - Adds a breadcrumb when the write starts and when it completes.
 * - Warns in console and adds a warning breadcrumb when the operation exceeds SLOW_WRITE_THRESHOLD_MS.
 * - Delegates error reporting to throwOnError.
 */
export async function executeTrackedWrite(
  operation: string,
  fn: () => Promise<{ error: PostgrestError | null }>,
): Promise<void> {
  const startTime = Date.now();

  addSentryBreadcrumb(`Supabase write started: ${operation}`, 'supabase.write', { operation });

  const result = await fn();
  const durationMs = Date.now() - startTime;

  if (durationMs >= SLOW_WRITE_THRESHOLD_MS) {
    addSentryBreadcrumb(
      `Slow Supabase write detected: ${operation}`,
      'supabase.write',
      { operation, durationMs },
      'warning',
    );
    console.warn(`[Supabase] Slow write detected: ${operation} took ${durationMs}ms`);
  }

  throwOnError(result, operation);
}
