/**
 * Shared E2E test data cleanup utilities.
 *
 * Provides beforeEach/afterEach helpers for write tests that create
 * data with the `e2e-write-` prefix. Uses service_role API to bypass RLS.
 */

import { resolveLocalServiceRoleKey } from '../../scripts/lib/local-service-role';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';

let serviceRoleKeyPromise: Promise<string> | undefined;

/** Mint the ES256 service_role key once and reuse it across every cleanup call. */
function getServiceRoleKey(): Promise<string> {
  serviceRoleKeyPromise ??= resolveLocalServiceRoleKey();
  return serviceRoleKeyPromise;
}

const WRITE_PREFIX = 'e2e-write-';

async function adminDelete(table: string, filter: string): Promise<number> {
  const serviceRoleKey = await getServiceRoleKey();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      Prefer: 'return=representation',
    },
  });

  if (!res.ok) {
    console.warn(`Warning: failed to delete from ${table}: ${res.status} ${await res.text()}`);
    return 0;
  }

  const deleted = await res.json();
  return Array.isArray(deleted) ? deleted.length : 0;
}

/**
 * Clean up posts created by write tests (title starts with e2e-write-).
 * Also cleans up any comments/replies on those posts via cascade.
 */
export async function cleanupWritePosts(): Promise<void> {
  const count = await adminDelete('posts', `title=like.${encodeURIComponent(WRITE_PREFIX)}*`);
  if (count > 0) {
    console.log(`  Cleaned up ${count} write-test posts`);
  }
}

/**
 * Clean up comments created by write tests (content starts with e2e-write-).
 */
export async function cleanupWriteComments(): Promise<void> {
  const count = await adminDelete('comments', `content=like.${encodeURIComponent(WRITE_PREFIX)}*`);
  if (count > 0) {
    console.log(`  Cleaned up ${count} write-test comments`);
  }
}

/**
 * Clean up all write-test data (posts and comments).
 * Call in beforeEach to guard against leftover data from failed runs.
 */
export async function cleanupAllWriteData(): Promise<void> {
  await cleanupWriteComments();
  await cleanupWritePosts();
}
