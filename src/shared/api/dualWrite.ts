/**
 * Dual-Write Helper
 *
 * Synchronizes Firestore writes to Supabase during migration.
 * - Firestore remains primary; Supabase errors are logged but don't block users
 * - Uses idempotency keys via try_acquire_write_lock RPC
 * - Tracks errors in Sentry for monitoring
 */

import * as Sentry from '@sentry/react';
import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient, isDualWriteEnabled } from './supabaseClient';
import { addSentryBreadcrumb, setSentryContext } from '@/sentry';

export class SupabaseDualWriteError extends Error {
  constructor(public readonly postgrestError: PostgrestError) {
    super(`Supabase dual-write error: ${postgrestError.message} (code: ${postgrestError.code}, details: ${postgrestError.details})`);
    this.name = 'SupabaseDualWriteError';
  }
}

/** Execute a Supabase operation and throw on error */
export function throwOnError(result: { error: PostgrestError | null }): void {
  if (result.error) {
    throw new SupabaseDualWriteError(result.error);
  }
}

export interface DualWriteOptions {
  /** Entity type: 'post', 'comment', 'user', etc. */
  entityType: string;
  /** Operation type: 'create', 'update', 'delete' */
  operationType: 'create' | 'update' | 'delete';
  /** Unique entity ID for idempotency */
  entityId: string;
  /** The Supabase write operation to execute */
  supabaseWrite: () => Promise<void>;
}

/**
 * Generate a unique operation ID for idempotency.
 * Format: entityType:operationType:entityId:timestamp
 */
function generateOpId(options: DualWriteOptions): string {
  return `${options.entityType}:${options.operationType}:${options.entityId}:${Date.now()}`;
}

/**
 * Try to acquire a write lock for idempotency.
 * Returns true if this is the first attempt, false if already processed.
 */
async function tryAcquireWriteLock(opId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('try_acquire_write_lock', {
    p_op_id: opId,
  });

  if (error) {
    // Log but don't fail - continue with write
    console.warn('Failed to acquire write lock:', error);
    return true; // Proceed with write on lock error
  }

  return data === true;
}

/**
 * Log dual-write error to Sentry without throwing.
 */
function logDualWriteError(error: unknown, options: DualWriteOptions): void {
  const errorMessage = error instanceof Error ? error.message : String(error);

  setSentryContext('dualWrite', {
    entityType: options.entityType,
    operationType: options.operationType,
    entityId: options.entityId,
    errorMessage,
  });

  addSentryBreadcrumb(
    `Dual-write failed: ${options.entityType}/${options.operationType}`,
    'dual_write',
    {
      entityType: options.entityType,
      operationType: options.operationType,
      entityId: options.entityId,
    },
    'error'
  );

  Sentry.withScope((scope) => {
    scope.setFingerprint(['dual_write', options.entityType, options.operationType]);
    scope.setLevel('warning'); // Warning, not error - Firestore is still working
    scope.setTag('dual_write.entity_type', options.entityType);
    scope.setTag('dual_write.operation_type', options.operationType);

    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(`Dual-write error: ${errorMessage}`);
    }
  });
}

async function persistFailedWrite(options: DualWriteOptions): Promise<void> {
  const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
  const { firestore } = await import('@/firebase');
  await addDoc(collection(firestore, '_supabase_write_failures'), {
    entityType: options.entityType,
    operationType: options.operationType,
    entityId: options.entityId,
    failedAt: serverTimestamp(),
    retried: false,
  });
}

/**
 * Execute a dual-write operation.
 *
 * This function never throws - Supabase errors are logged but don't block users.
 * Firestore remains the source of truth during migration.
 *
 * @example
 * ```ts
 * await dualWrite({
 *   entityType: 'post',
 *   operationType: 'create',
 *   entityId: postId,
 *   supabaseWrite: async () => {
 *     await supabase.from('posts').insert({ id: postId, ... });
 *   },
 * });
 * ```
 */
export async function dualWrite(options: DualWriteOptions): Promise<void> {
  // Skip if dual-write is disabled
  if (!isDualWriteEnabled()) {
    return;
  }

  try {
    // Try to acquire idempotency lock
    const opId = generateOpId(options);
    const shouldWrite = await tryAcquireWriteLock(opId);

    if (!shouldWrite) {
      // Already processed - skip
      addSentryBreadcrumb(
        `Dual-write skipped (idempotent): ${options.entityType}/${options.entityId}`,
        'dual_write',
        { opId },
        'info'
      );
      return;
    }

    // Execute Supabase write
    await options.supabaseWrite();

    addSentryBreadcrumb(
      `Dual-write success: ${options.entityType}/${options.operationType}`,
      'dual_write',
      {
        entityType: options.entityType,
        operationType: options.operationType,
        entityId: options.entityId,
      },
      'info'
    );
  } catch (error) {
    // Log error but don't throw - Firestore is source of truth
    logDualWriteError(error, options);
    if (error instanceof SupabaseDualWriteError) {
      persistFailedWrite(options).catch(console.error);
    }
  }
}

/**
 * Execute multiple dual-write operations (for batch operations like block/unblock).
 *
 * @example
 * ```ts
 * await dualWriteBatch([
 *   {
 *     entityType: 'block',
 *     operationType: 'create',
 *     entityId: `${blockerId}_${blockedId}`,
 *     supabaseWrite: async () => {
 *       await supabase.from('blocks').insert({ ... });
 *     },
 *   },
 *   {
 *     entityType: 'board_waiting_users',
 *     operationType: 'delete',
 *     entityId: `${boardId}_${blockedId}`,
 *     supabaseWrite: async () => {
 *       await supabase.from('board_waiting_users').delete().match({ ... });
 *     },
 *   },
 * ]);
 * ```
 */
export async function dualWriteBatch(operations: DualWriteOptions[]): Promise<void> {
  // Skip if dual-write is disabled
  if (!isDualWriteEnabled()) {
    return;
  }

  // Execute all operations in parallel, each with its own error handling
  await Promise.all(operations.map((op) => dualWrite(op)));
}
