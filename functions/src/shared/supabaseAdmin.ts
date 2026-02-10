/**
 * Server-side Supabase Admin Client
 *
 * For use in Firebase Cloud Functions during dual-write migration.
 * Uses service role key for full database access.
 */

import { createClient, SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import admin from "./admin";

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get the singleton Supabase admin client instance.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseInstance;
}

/**
 * Check if dual-write is enabled for Cloud Functions.
 */
export function isDualWriteEnabled(): boolean {
  return process.env.DUAL_WRITE_ENABLED === "true";
}

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

/**
 * Try to acquire a write lock for idempotency.
 * Returns true if this is the first attempt, false if already processed.
 */
export async function tryAcquireWriteLock(opId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("try_acquire_write_lock", {
    p_op_id: opId,
  });

  if (error) {
    console.warn("Failed to acquire write lock:", error);
    return true; // Proceed with write on lock error
  }

  return data === true;
}

async function persistFailedWrite(entityType: string, operationType: string, entityId: string): Promise<void> {
  await admin.firestore().collection('_supabase_write_failures').add({
    entityType,
    operationType,
    entityId,
    failedAt: admin.firestore.Timestamp.now(),
    retried: false,
    source: 'cloud_function',
  });
}

/**
 * Execute a dual-write operation in Cloud Functions.
 * Never throws - logs errors but doesn't block the function.
 */
export async function dualWriteServer(
  entityType: string,
  operationType: "create" | "update" | "delete",
  entityId: string,
  supabaseWrite: () => Promise<void>
): Promise<void> {
  if (!isDualWriteEnabled()) {
    return;
  }

  const opId = `${entityType}:${operationType}:${entityId}:${Date.now()}`;

  try {
    const shouldWrite = await tryAcquireWriteLock(opId);
    if (!shouldWrite) {
      console.log(`Dual-write skipped (idempotent): ${opId}`);
      return;
    }

    await supabaseWrite();
    console.log(`Dual-write success: ${entityType}/${operationType}/${entityId}`);
  } catch (error) {
    console.error(`Dual-write error: ${entityType}/${operationType}/${entityId}`, error);
    if (error instanceof SupabaseDualWriteError) {
      persistFailedWrite(entityType, operationType, entityId).catch(console.error);
    }
    // Don't throw - Firestore is source of truth
  }
}
