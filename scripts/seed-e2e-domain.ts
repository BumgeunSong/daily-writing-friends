#!/usr/bin/env -S npx tsx

/**
 * Seed Supabase with domain data for E2E testing.
 *
 * Creates boards, memberships, posts, and comments via the Supabase Admin API (service_role key).
 * Must run AFTER seed-e2e-users.ts (depends on e2e-users.json for user IDs).
 *
 * Usage:
 *   npx tsx scripts/seed-e2e-domain.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

/** Posts per page in the app (from useBestPosts.ts) */
const PAGE_SIZE = 20;

/** Number of extra posts beyond PAGE_SIZE for infinite scroll testing */
const EXTRA_POSTS = 5;

/** Number of consecutive days for streak testing */
const STREAK_DAYS = 7;

const BOARD_ID = 'e2e-test-board';

// ── Runtime guard ───────────────────────────────────────────────────────

function assertLocalSupabase(): void {
  if (!SUPABASE_URL.includes('127.0.0.1') && !SUPABASE_URL.includes('localhost')) {
    console.error(
      `ERROR: seed-e2e-domain.ts refuses to run against non-local Supabase.\n` +
      `  SUPABASE_URL = ${SUPABASE_URL}\n` +
      `  This script only targets 127.0.0.1 or localhost.`,
    );
    process.exit(1);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

async function adminFetch(pathStr: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}${pathStr}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      Prefer: 'resolution=merge-duplicates',
      ...options.headers,
    },
  });
  return res;
}

async function upsert(table: string, rows: Record<string, unknown>[]) {
  const res = await adminFetch(`/rest/v1/${table}`, {
    method: 'POST',
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to upsert ${table}: ${res.status} ${text}`);
  }
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function generateId(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

// ── Load user IDs ───────────────────────────────────────────────────────

interface UserIds {
  [email: string]: string;
}

async function loadUserIds(): Promise<UserIds> {
  const usersPath = path.join(__dirname, '..', 'tests', 'fixtures', 'e2e-users.json');

  let raw: string;
  try {
    raw = await fs.readFile(usersPath, 'utf8');
  } catch {
    throw new Error(
      `Cannot read ${usersPath}.\n` +
      `Run seed-e2e-users.ts first to generate e2e-users.json.`,
    );
  }

  const userIds: UserIds = JSON.parse(raw);

  const memberEmail = 'e2e@example.com';
  const nonMemberEmail = 'e2e2@example.com';

  if (!userIds[memberEmail]) {
    throw new Error(`User ID for ${memberEmail} not found in e2e-users.json`);
  }
  if (!userIds[nonMemberEmail]) {
    throw new Error(`User ID for ${nonMemberEmail} not found in e2e-users.json`);
  }

  return userIds;
}

// ── Seed functions ──────────────────────────────────────────────────────

async function seedBoard() {
  console.log('Seeding board...');
  await upsert('boards', [
    {
      id: BOARD_ID,
      title: 'E2E Test Board',
      description: 'Board for E2E testing',
      first_day: daysAgo(30),
      cohort: 1,
    },
  ]);
  console.log(`  Board "${BOARD_ID}" upserted`);
}

async function seedMemberships(userIds: UserIds) {
  console.log('Seeding memberships...');
  const memberId = userIds['e2e@example.com'];

  await upsert('user_board_permissions', [
    {
      id: `e2e-perm-${memberId}`,
      user_id: memberId,
      board_id: BOARD_ID,
      permission: 'write',
    },
  ]);
  console.log(`  Member permission for e2e@ upserted`);
  // e2e2@ intentionally has NO membership (non-member test)
  console.log(`  e2e2@ has no membership (non-member)`);
}

async function seedPosts(userIds: UserIds): Promise<string[]> {
  console.log('Seeding posts...');
  const authorId = userIds['e2e@example.com'];
  const totalPosts = PAGE_SIZE + EXTRA_POSTS;
  const postIds: string[] = [];

  const posts: Record<string, unknown>[] = [];
  for (let i = 0; i < totalPosts; i++) {
    const postId = generateId('e2e-post', i);
    postIds.push(postId);

    // Spread posts across days for realistic data
    // Streak posts (last 7) are on consecutive days ending today
    const isStreakPost = i >= totalPosts - STREAK_DAYS;
    const daysBack = isStreakPost
      ? totalPosts - 1 - i // 6, 5, 4, 3, 2, 1, 0 (today)
      : totalPosts - i; // older posts spread further back

    posts.push({
      id: postId,
      board_id: BOARD_ID,
      author_id: authorId,
      author_name: 'E2E Test User',
      title: `E2E Seeded Post ${i + 1}`,
      content: `<p>This is seeded post number ${i + 1} for E2E testing.</p>`,
      visibility: 'public',
      created_at: daysAgo(daysBack),
      updated_at: daysAgo(daysBack),
    });
  }

  await upsert('posts', posts);
  console.log(`  ${totalPosts} posts upserted (includes ${STREAK_DAYS}-day streak)`);
  return postIds;
}

async function runSql(sql: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ query: sql }),
  });
  // rpc endpoint may not exist; fall back to pg-meta
  if (!res.ok) {
    // Use the SQL endpoint via supabase's pg-meta
    const pgRes = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({ query: sql }),
    });
    if (!pgRes.ok) {
      console.warn(`  Warning: could not run SQL: ${sql.substring(0, 80)}...`);
    }
  }
}

async function seedComments(userIds: UserIds, postIds: string[]) {
  console.log('Seeding comments...');
  const commenterId = userIds['e2e@example.com'];

  if (postIds.length < 2) {
    console.warn('  Not enough posts to seed comments, skipping');
    return;
  }

  // Disable notification triggers that fail locally (no edge function URL configured)
  await runSql('ALTER TABLE comments DISABLE TRIGGER trg_notify_comment');
  await runSql('ALTER TABLE replies DISABLE TRIGGER trg_notify_reply');

  try {
    await upsert('comments', [
      {
        id: 'e2e-comment-001',
        post_id: postIds[0],
        user_id: commenterId,
        user_name: 'E2E Test User',
        content: 'E2E seeded comment 1',
        created_at: daysAgo(1),
        updated_at: daysAgo(1),
      },
      {
        id: 'e2e-comment-002',
        post_id: postIds[1],
        user_id: commenterId,
        user_name: 'E2E Test User',
        content: 'E2E seeded comment 2',
        created_at: daysAgo(0),
        updated_at: daysAgo(0),
      },
    ]);
    console.log(`  2 comments upserted`);
  } finally {
    // Re-enable triggers
    await runSql('ALTER TABLE comments ENABLE TRIGGER trg_notify_comment');
    await runSql('ALTER TABLE replies ENABLE TRIGGER trg_notify_reply');
  }
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  assertLocalSupabase();

  console.log('Seeding E2E domain data into Supabase local...\n');

  const userIds = await loadUserIds();
  console.log('User IDs loaded from e2e-users.json\n');

  await seedBoard();
  await seedMemberships(userIds);
  const postIds = await seedPosts(userIds);
  await seedComments(userIds, postIds);

  // Write domain fixture output
  const domainData = {
    boardId: BOARD_ID,
    postIds,
    commentIds: ['e2e-comment-001', 'e2e-comment-002'],
    memberUserId: userIds['e2e@example.com'],
    nonMemberUserId: userIds['e2e2@example.com'],
    pageSize: PAGE_SIZE,
  };

  const outPath = path.join(__dirname, '..', 'tests', 'fixtures', 'e2e-domain.json');
  await fs.writeFile(outPath, JSON.stringify(domainData, null, 2));
  console.log(`\nDomain data saved to ${outPath}`);

  console.log('\nDomain seeding complete.');
}

main().catch((err) => {
  console.error('Domain seeding failed:', err);
  process.exit(1);
});
