/**
 * Shadow Read Utilities
 *
 * Compare Firestore and Supabase results during migration.
 * Logs mismatches to console (and optionally Sentry).
 */

import * as Sentry from '@sentry/react';
import { devLog } from '@/shared/utils/devLog';

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
export function compareShadowResults<F, S>(
  firestoreData: F[],
  supabaseData: S[],
  getFirestoreId: (item: F) => string,
  getSupabaseId?: (item: S) => string
): ShadowCompareResult {
  const firestoreIds = new Set(firestoreData.map(getFirestoreId));
  const supabaseIds = new Set(supabaseData.map(getSupabaseId ?? (getFirestoreId as unknown as (item: S) => string)));

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
  devLog({
    category: 'shadow-read',
    event: 'compare-mismatch',
    level: 'warn',
    data: {
      queryType,
      userId,
      firestoreCount: result.firestoreCount,
      supabaseCount: result.supabaseCount,
      missingInSupabase: result.missingInSupabase.slice(0, 5),
      missingInFirestore: result.missingInFirestore.slice(0, 5),
    },
  });

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
