import { test as teardown } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * Production E2E teardown
 *
 * Cleans up test data created during production E2E runs.
 * Only executes when E2E_ENV=production — skipped for local environments.
 *
 * Deletion order respects FK constraints:
 *   reactions → replies → likes → notifications → comments → posts
 */

teardown('cleanup production test data', async () => {
  const e2eEnv = process.env.E2E_ENV;
  if (e2eEnv !== 'production') {
    console.log(`Skipping prod teardown (E2E_ENV=${e2eEnv ?? 'unset'})`);
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userEmail = process.env.E2E_REGULAR_EMAIL;
  const adminEmail = process.env.E2E_ADMIN_EMAIL;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for production teardown');
  }

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  // Helper: DELETE rows matching a filter, returns count of deleted rows
  async function deleteWhere(table: string, filter: string): Promise<number> {
    const url = `${supabaseUrl}/rest/v1/${table}?${filter}`;
    const res = await fetch(url, { method: 'DELETE', headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`DELETE ${table} (${filter}) failed ${res.status}: ${body}`);
    }
    const rows: unknown[] = await res.json();
    return Array.isArray(rows) ? rows.length : 0;
  }

  // Helper: look up a user's UID by email via the Supabase Admin API
  async function getUserId(email: string): Promise<string | null> {
    const url = `${supabaseUrl}/auth/v1/admin/users`;
    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GET admin/users failed ${res.status}: ${body}`);
    }
    const data: { users?: Array<{ id: string; email: string }> } = await res.json();
    const match = data.users?.find((u) => u.email === email);
    return match?.id ?? null;
  }

  console.log('Starting production test data cleanup...');

  // Resolve test user IDs
  const emailsToResolve: Array<[string, string | undefined]> = [
    ['user', userEmail],
    ['admin', adminEmail],
  ];

  const userIds: string[] = [];
  for (const [label, email] of emailsToResolve) {
    if (!email) {
      console.log(`  ${label} email not set, skipping`);
      continue;
    }
    const id = await getUserId(email);
    if (id) {
      userIds.push(id);
      console.log(`  Resolved ${label} (${email}) -> ${id}`);
    } else {
      console.log(`  ${label} (${email}) not found in users table`);
    }
  }

  if (userIds.length === 0) {
    console.log('No test user IDs resolved — nothing to delete.');
  } else {
    // Build an IN filter string compatible with PostgREST
    const inFilter = (ids: string[]) => `in.(${ids.join(',')})`;

    // 1. Reactions (user_id)
    const reactionsDeleted = await deleteWhere('reactions', `user_id=${inFilter(userIds)}`);
    console.log(`  Deleted ${reactionsDeleted} reactions`);

    // 2. Replies (user_id)
    const repliesDeleted = await deleteWhere('replies', `user_id=${inFilter(userIds)}`);
    console.log(`  Deleted ${repliesDeleted} replies`);

    // 3. Likes (user_id)
    const likesDeleted = await deleteWhere('likes', `user_id=${inFilter(userIds)}`);
    console.log(`  Deleted ${likesDeleted} likes`);

    // 4. Notifications — actor_id (actions taken by test users)
    const notificationsActorDeleted = await deleteWhere('notifications', `actor_id=${inFilter(userIds)}`);
    console.log(`  Deleted ${notificationsActorDeleted} notifications (actor)`);

    // 5. Notifications — recipient_id (notifications received by test users)
    const notificationsRecipientDeleted = await deleteWhere('notifications', `recipient_id=${inFilter(userIds)}`);
    console.log(`  Deleted ${notificationsRecipientDeleted} notifications (recipient)`);

    // 6. Comments (user_id)
    const commentsDeleted = await deleteWhere('comments', `user_id=${inFilter(userIds)}`);
    console.log(`  Deleted ${commentsDeleted} comments`);

    // 7. Posts (author_id)
    const postsDeleted = await deleteWhere('posts', `author_id=${inFilter(userIds)}`);
    console.log(`  Deleted ${postsDeleted} posts`);
  }

  // Clean up local auth state file
  const storageStateFile = path.join(__dirname, 'storageState.auth.json');
  try {
    await fs.access(storageStateFile);
    await fs.unlink(storageStateFile);
    console.log(`  Removed: ${path.basename(storageStateFile)}`);
  } catch {
    // File doesn't exist — nothing to remove
  }

  console.log('Production test data cleanup completed.');
});
