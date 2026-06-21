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

export interface SlowWriteReport {
  breadcrumb: {
    message: string;
    category: 'supabase.write';
    data: { operation: string; durationMs: number };
    level: 'warning';
  };
  consoleMessage: string;
}

/**
 * Pure decision for slow-write reporting. Returns null when the duration is
 * below the threshold, otherwise returns the exact payload the imperative
 * shell should emit to Sentry and the console.
 */
export function detectSlowWrite(
  operation: string,
  durationMs: number,
  threshold: number = SLOW_WRITE_THRESHOLD_MS,
): SlowWriteReport | null {
  if (durationMs < threshold) return null;
  return {
    breadcrumb: {
      message: `Slow Supabase write detected: ${operation}`,
      category: 'supabase.write',
      data: { operation, durationMs },
      level: 'warning',
    },
    consoleMessage: `[Supabase] Slow write detected: ${operation} took ${durationMs}ms`,
  };
}

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

export class SupabaseNetworkError extends Error {
  constructor(public readonly postgrestError: PostgrestError) {
    super(`Supabase network error: ${postgrestError.message}`);
    this.name = 'SupabaseNetworkError';
  }
}

const NETWORK_ERROR_PATTERNS = [
  'Load failed',
  'Failed to fetch',
  'NetworkError',
  'network error',
  'cancelled',
  'AbortError',
];

export function isNetworkError(error: PostgrestError): boolean {
  return !error.code && NETWORK_ERROR_PATTERNS.some((p) => error.message.includes(p));
}

/** Execute a Supabase operation and throw on error, reporting to Sentry if an error occurs */
export function throwOnError(
  result: { error: PostgrestError | null },
  operation?: string,
): void {
  if (result.error) {
    const error = result.error;
    if (isNetworkError(error)) {
      addSentryBreadcrumb(
        operation ? `Supabase network error: ${operation}` : 'Supabase network error',
        'supabase.write',
        { message: error.message, operation },
        'warning',
      );
      throw new SupabaseNetworkError(error);
    }


    const writeError = new SupabaseWriteError(error);

    addSentryBreadcrumb(
      operation ? `Supabase write failed: ${operation}` : 'Supabase write failed',
      'supabase.write',
      {
        code: error.code,
        message: error.message,
        details: error.details,
        operation,
      },
      'error',
    );

    Sentry.withScope((scope) => {
      scope.setContext('supabaseError', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        operation,
      });
      if (error.code === '42501') {
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

  const slowWriteReport = detectSlowWrite(operation, durationMs);
  if (slowWriteReport) {
    addSentryBreadcrumb(
      slowWriteReport.breadcrumb.message,
      slowWriteReport.breadcrumb.category,
      slowWriteReport.breadcrumb.data,
      slowWriteReport.breadcrumb.level,
    );
    console.warn(slowWriteReport.consoleMessage);
  }

  throwOnError(result, operation);
}
