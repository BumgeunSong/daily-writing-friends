#!/usr/bin/env -S npx tsx
/**
 * Layer-4 verify fixture: post data specifically required by T.3–T.11.
 * Runs after seed-e2e-users.ts + seed-e2e-domain.ts.
 *
 * Local Supabase only. Uses the deterministic local service_role key.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const BOARD_ID = 'e2e-test-board';

async function loadUserIds(): Promise<Record<string, string>> {
  const raw = await fs.readFile(
    path.join(__dirname, '..', '..', '..', '..', '..', 'tests', 'fixtures', 'e2e-users.json'),
    'utf8',
  );
  return JSON.parse(raw);
}

async function insert(rows: Record<string, unknown>[]) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    throw new Error(`insert posts failed: ${res.status} ${await res.text()}`);
  }
}

function daysAgo(days: number, extraMinutes = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setMinutes(d.getMinutes() - extraMinutes);
  return d.toISOString();
}

async function main() {
  const users = await loadUserIds();
  const userA = users['e2e@example.com'];
  const userB = users['e2e2@example.com'];
  if (!userA || !userB) throw new Error('user ids missing');

  const rows: Record<string, unknown>[] = [];

  // T.3 — '오늘의 작성' (Korean 2-char substring '오늘' must match this title)
  rows.push({
    id: 'verify-post-today',
    board_id: BOARD_ID,
    author_id: userA,
    author_name: 'E2E Test User',
    title: '오늘의 작성',
    content: '<p>오늘 글 본문</p>',
    visibility: 'public',
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
  });

  // T.4 — 1500-char body with BODYNEEDLE at exact offset 1000
  const bodyChars = 'a'.repeat(1000) + 'BODYNEEDLE' + 'b'.repeat(490);
  rows.push({
    id: 'verify-post-longbody',
    board_id: BOARD_ID,
    author_id: userA,
    author_name: 'E2E Test User',
    title: 'long-body fixture',
    content: bodyChars,
    visibility: 'public',
    created_at: daysAgo(4),
    updated_at: daysAgo(4),
  });

  // T.5 — 60 LIMITNEEDLE posts, descending created_at by minute offset.
  // Newest 50 should appear; oldest 10 (i=51..60) must be cap-excluded.
  for (let i = 1; i <= 60; i++) {
    rows.push({
      id: `verify-post-limit-${String(i).padStart(3, '0')}`,
      board_id: BOARD_ID,
      author_id: userA,
      author_name: 'E2E Test User',
      title: `LIMITNEEDLE #${String(i).padStart(3, '0')}`,
      content: `<p>filler ${i}</p>`,
      visibility: 'public',
      created_at: daysAgo(7, i),
      updated_at: daysAgo(7, i),
    });
  }

  // T.6 / T.11 — User B public + private ALPHA_ONLY posts
  rows.push({
    id: 'verify-post-b-public',
    board_id: BOARD_ID,
    author_id: userB,
    author_name: 'E2E Test User 2',
    title: 'B public',
    content: '<p>ALPHA_ONLY phrase here</p>',
    visibility: 'public',
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
  });
  rows.push({
    id: 'verify-post-b-private',
    board_id: BOARD_ID,
    author_id: userB,
    author_name: 'E2E Test User 2',
    title: 'B private',
    content: '<p>ALPHA_ONLY secret</p>',
    visibility: 'private',
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
  });

  await insert(rows);
  console.log(`Seeded ${rows.length} verify-specific posts.`);
  console.log(`  User A id: ${userA}`);
  console.log(`  User B id: ${userB}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
