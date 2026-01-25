/**
 * Shadow Read Utilities
 *
 * Compare Firestore and Supabase results during migration.
 * Logs mismatches to console (and optionally Sentry).
 */

import * as Sentry from '@sentry/react';

export interface ShadowCompareResult {
  match: boolean;
  firestoreCount: number;
  supabaseCount: number;
  missingInSupabase: string[];
  missingInFirestore: string[];
}

/**
 * Compare two arrays of items by ID.
 * Used to validate Supabase reads match Firestore.
 */
export function compareShadowResults<T extends { id?: string }>(
  firestoreData: T[],
  supabaseData: T[],
  getId: (item: T) => string
): ShadowCompareResult {
  const firestoreIds = new Set(firestoreData.map(getId));
  const supabaseIds = new Set(supabaseData.map(getId));

  const missingInSupabase = [...firestoreIds].filter((id) => !supabaseIds.has(id));
  const missingInFirestore = [...supabaseIds].filter((id) => !firestoreIds.has(id));

  const match = missingInSupabase.length === 0 && missingInFirestore.length === 0;

  return {
    match,
    firestoreCount: firestoreData.length,
    supabaseCount: supabaseData.length,
    missingInSupabase,
    missingInFirestore,
  };
}

/**
 * Log shadow read mismatch for debugging.
 */
export function logShadowMismatch(
  queryType: string,
  userId: string,
  result: ShadowCompareResult
): void {
  const message = `Shadow read mismatch: ${queryType} for user ${userId}`;
  console.warn(message, {
    firestoreCount: result.firestoreCount,
    supabaseCount: result.supabaseCount,
    missingInSupabase: result.missingInSupabase.slice(0, 5), // Limit for logging
    missingInFirestore: result.missingInFirestore.slice(0, 5),
  });

  // Log to Sentry for monitoring
  Sentry.captureMessage(message, {
    level: 'warning',
    extra: {
      queryType,
      userId,
      firestoreCount: result.firestoreCount,
      supabaseCount: result.supabaseCount,
      missingInSupabase: result.missingInSupabase,
      missingInFirestore: result.missingInFirestore,
    },
  });
}
