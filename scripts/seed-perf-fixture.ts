#!/usr/bin/env -S npx tsx

/**
 * Seed a FROZEN, DETERMINISTIC performance-measurement fixture into local Supabase.
 *
 * This is the ground-truth content the Web Vitals loop measures against. Every run
 * produces byte-identical rows (fixed PRNG seed + fixed timestamps), so score
 * deltas reflect code changes, not data drift.
 *
 * Shape is modelled on production (see docs/plans/2026-05-31-web-vitals-loop-design.md):
 *   - active+member test user (e2e@example.com) so `/` deterministically redirects to /boards
 *   - 4 boards (so the /boards grid renders a realistic card grid)
 *   - 50 posts on the primary board with a realistic content_length distribution
 *     (median ~1200, some ~2000, a few ~3300, one long outlier)
 *   - 20% of posts carry a thumbnail (text-dominant feed — matches prod's 21%)
 *   - one detail post with 3 comments (prod median)
 *   - 35 notifications for the inbox route
 *
 * Run order (the harness does this on a fresh `supabase db reset`):
 *   npx tsx scripts/seed-e2e-users.ts        # creates e2e@ / e2e2@, writes e2e-users.json
 *   npx tsx scripts/seed-perf-fixture.ts     # this script
 *
 * Local-only. Refuses to run against non-local Supabase.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  // Default local dev service_role key (not a secret — deterministic for local dev)
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

/** The default active_board_id from useRemoteConfig. Membership here = "active" user
 *  → RootRedirect sends `/` to `/boards`. Must match REMOTE_CONFIG_DEFAULTS.active_board_id. */
const PRIMARY_BOARD_ID = '1a65026a-cf93-4828-be54-fd8d034008da';
const SECONDARY_BOARD_IDS = ['perf-board-2', 'perf-board-3', 'perf-board-4'];

const MEMBER_EMAIL = 'e2e@example.com';
const ACTOR_EMAIL = 'e2e2@example.com'; // commenter / notification actor (not self)

const POST_COUNT = 50;
const NOTIFICATION_COUNT = 35;
const DETAIL_COMMENT_COUNT = 3;

/** Same-origin committed placeholder images (served from apps/web/public/perf-fixtures/).
 *  Same-origin keeps the fixture deterministic; Lighthouse simulated throttling still
 *  models transfer time from the response byte size, so image LCP stays realistic. */
const THUMBNAIL_URL = '/perf-fixtures/thumbnail.jpg';
const AVATAR_URL = '/perf-fixtures/avatar.jpg';

/** Anchor all timestamps to a fixed instant so content never drifts as wall-clock advances. */
const EPOCH = Date.parse('2026-05-01T00:00:00+09:00');

// ── Deterministic PRNG (mulberry32) ───────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Deterministic synthetic Korean prose ──────────────────────────────────

const SENTENCES = [
  '오늘은 아침 일찍 일어나 창밖을 바라보며 하루를 시작했다.',
  '글을 쓴다는 것은 결국 나 자신과 마주하는 일이라는 걸 다시 느낀다.',
  '커피 한 잔을 내려 마시며 어제 읽었던 문장을 곱씹어 보았다.',
  '작은 습관 하나가 삶의 결을 바꾼다는 말을 요즘 자주 떠올린다.',
  '비가 오는 날이면 어김없이 떠오르는 기억들이 있다.',
  '완벽하지 않아도 괜찮다고, 스스로에게 말해주는 연습을 한다.',
  '매일 한 편씩 쓰다 보면 어느새 나만의 목소리가 생긴다.',
  '문장을 다듬는 시간은 생각을 다듬는 시간과 다르지 않다.',
  '오래 미뤄둔 일을 마침내 시작했을 때의 후련함을 기록한다.',
  '하루를 돌아보면 사소한 순간들이 가장 오래 남는다는 걸 안다.',
  '읽는 사람의 마음을 헤아리며 한 단어를 더 고른다.',
  '실패한 날에도 무언가를 적어두면 그것이 다음의 씨앗이 된다.',
];

/** Build deterministic HTML content of approximately `targetLen` codepoints. */
function buildContent(rand: () => number, targetLen: number): string {
  const paragraphs: string[] = [];
  let current: string[] = [];
  let len = 0;
  while (len < targetLen) {
    const sentence = SENTENCES[Math.floor(rand() * SENTENCES.length)];
    current.push(sentence);
    len += sentence.length;
    if (current.length >= 3) {
      paragraphs.push(`<p>${current.join(' ')}</p>`);
      current = [];
    }
  }
  if (current.length) paragraphs.push(`<p>${current.join(' ')}</p>`);
  return paragraphs.join('\n');
}

/** Target content_length for post i, reproducing the prod distribution. */
function targetLengthFor(i: number): number {
  if (i === 7) return 10000; // single long outlier
  const bucket = i % 10;
  if (bucket <= 6) return 900 + (i % 5) * 120; // ~70%: 900–1380 (median ~1200)
  if (bucket <= 8) return 1800 + (i % 3) * 300; // ~20%: 1800–2400
  return 3000 + (i % 2) * 600; // ~10%: 3000–3600
}

function isoFromEpoch(offsetMinutes: number): string {
  return new Date(EPOCH - offsetMinutes * 60_000).toISOString();
}

// ── HTTP helpers ──────────────────────────────────────────────────────────

function assertLocalSupabase(): void {
  if (!SUPABASE_URL.includes('127.0.0.1') && !SUPABASE_URL.includes('localhost')) {
    console.error(
      `ERROR: seed-perf-fixture.ts refuses to run against non-local Supabase.\n` +
        `  SUPABASE_URL = ${SUPABASE_URL}`,
    );
    process.exit(1);
  }
}

async function adminFetch(pathStr: string, options: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}${pathStr}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      Prefer: 'resolution=merge-duplicates',
      ...options.headers,
    },
  });
}

async function upsert(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const res = await adminFetch(`/rest/v1/${table}`, {
    method: 'POST',
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    throw new Error(`Failed to upsert ${table}: ${res.status} ${await res.text()}`);
  }
}

async function loadUserIds(): Promise<Record<string, string>> {
  const usersPath = path.join(__dirname, '..', 'tests', 'fixtures', 'e2e-users.json');
  let raw: string;
  try {
    raw = await fs.readFile(usersPath, 'utf8');
  } catch {
    throw new Error(`Cannot read ${usersPath}. Run scripts/seed-e2e-users.ts first.`);
  }
  const ids: Record<string, string> = JSON.parse(raw);
  for (const email of [MEMBER_EMAIL, ACTOR_EMAIL]) {
    if (!ids[email]) throw new Error(`User id for ${email} missing in e2e-users.json`);
  }
  return ids;
}

// ── Seed steps ──────────────────────────────────────────────────────────

async function seedBoards() {
  console.log('Seeding boards...');
  const boards = [
    {
      id: PRIMARY_BOARD_ID,
      title: '매일 글쓰기 프렌즈 8기',
      description: '매일 한 편씩 글을 쓰는 4주 프로그램',
      cohort: 8,
      first_day: isoFromEpoch(30 * 24 * 60),
      last_day: isoFromEpoch(-2 * 24 * 60),
    },
    ...SECONDARY_BOARD_IDS.map((id, idx) => ({
      id,
      title: `매일 글쓰기 프렌즈 ${7 - idx}기`,
      description: '지난 기수 보드',
      cohort: 7 - idx,
      first_day: isoFromEpoch((90 + idx * 30) * 24 * 60),
      last_day: isoFromEpoch((62 + idx * 30) * 24 * 60),
    })),
  ];
  await upsert('boards', boards);
  console.log(`  ${boards.length} boards upserted (primary=${PRIMARY_BOARD_ID})`);
}

async function seedMembershipsAndProfiles(memberId: string, actorId: string) {
  console.log('Seeding memberships + profiles...');
  // Member writes on all 4 boards; membership on PRIMARY_BOARD_ID makes the user "active".
  const allBoards = [PRIMARY_BOARD_ID, ...SECONDARY_BOARD_IDS];
  await upsert(
    'user_board_permissions',
    allBoards.map((boardId) => ({
      id: `perf-perm-${memberId}-${boardId}`,
      user_id: memberId,
      board_id: boardId,
      permission: 'write',
    })),
  );
  // Actor is a member of the primary board too (valid commenter/notifier).
  await upsert('user_board_permissions', [
    {
      id: `perf-perm-${actorId}-${PRIMARY_BOARD_ID}`,
      user_id: actorId,
      board_id: PRIMARY_BOARD_ID,
      permission: 'write',
    },
  ]);
  // Give both users avatars so feed cards render a real (throttled) avatar image.
  await upsert('users', [
    { id: memberId, profile_photo_url: AVATAR_URL },
    { id: actorId, profile_photo_url: AVATAR_URL },
  ]);
  console.log(`  member on ${allBoards.length} boards, actor on primary, avatars set`);
}

interface SeededPost {
  id: string;
  hasThumbnail: boolean;
}

async function seedPosts(memberId: string): Promise<SeededPost[]> {
  console.log('Seeding posts...');
  const rand = mulberry32(0x5eed);
  const posts: Record<string, unknown>[] = [];
  const seeded: SeededPost[] = [];

  for (let i = 0; i < POST_COUNT; i++) {
    const id = `perf-post-${String(i).padStart(3, '0')}`;
    const content = buildContent(rand, targetLengthFor(i));
    const hasThumbnail = i % 5 === 0; // 10 of 50 = 20% (prod ~21%)
    // Newest first: post 0 is most recent.
    const createdAt = isoFromEpoch(i * 6 * 60); // 6h apart, descending from EPOCH
    // content_length and content_preview are GENERATED columns — derived from content, never set.
    posts.push({
      id,
      board_id: PRIMARY_BOARD_ID,
      author_id: memberId,
      author_name: '글쓰기 프렌즈',
      title: `${i + 1}일차 글쓰기`,
      content,
      thumbnail_image_url: hasThumbnail ? THUMBNAIL_URL : null,
      visibility: 'public',
      created_at: createdAt,
      updated_at: createdAt,
    });
    seeded.push({ id, hasThumbnail });
  }

  await upsert('posts', posts);
  console.log(
    `  ${POST_COUNT} posts upserted (${seeded.filter((p) => p.hasThumbnail).length} with thumbnail)`,
  );
  return seeded;
}

async function runSqlBestEffort(sql: string) {
  // pg-meta query endpoint (available on local supabase). Best-effort: trigger toggling.
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) console.warn(`  (warn) could not run: ${sql.slice(0, 60)}...`);
}

async function seedComments(actorId: string, detailPostId: string) {
  console.log('Seeding comments on detail post...');
  await runSqlBestEffort('ALTER TABLE comments DISABLE TRIGGER trg_notify_comment');
  try {
    await upsert(
      'comments',
      Array.from({ length: DETAIL_COMMENT_COUNT }, (_, i) => ({
        id: `perf-comment-${String(i).padStart(3, '0')}`,
        post_id: detailPostId,
        user_id: actorId,
        user_name: '글벗',
        user_profile_image: AVATAR_URL,
        content: `좋은 글 잘 읽었어요. ${i + 1}번째 댓글입니다.`,
        created_at: isoFromEpoch(i * 30),
        updated_at: isoFromEpoch(i * 30),
      })),
    );
    console.log(`  ${DETAIL_COMMENT_COUNT} comments on ${detailPostId}`);
  } finally {
    await runSqlBestEffort('ALTER TABLE comments ENABLE TRIGGER trg_notify_comment');
  }
}

async function seedNotifications(memberId: string, actorId: string, posts: SeededPost[]) {
  console.log('Seeding notifications...');
  // Only like_on_post and comment_on_post: the app's DTO mapper requires a
  // commentId for comment_on_post and a replyId for reply_on_post. We seed real
  // comments (referenced below) but no replies, so reply_on_post is omitted.
  // A like-heavy mix with some comments matches the prod inbox shape.
  const types = [
    'like_on_post',
    'comment_on_post',
    'like_on_post',
    'like_on_post',
    'comment_on_post',
  ] as const;
  const messageFor: Record<string, string> = {
    like_on_post: '글벗님이 회원님의 글을 좋아합니다.',
    comment_on_post: '글벗님이 회원님의 글에 댓글을 남겼습니다.',
  };
  const rows = Array.from({ length: NOTIFICATION_COUNT }, (_, i) => {
    const type = types[i % types.length];
    const post = posts[i % posts.length];
    // comment_on_post must carry a valid comment_id (FK -> comments).
    const commentId =
      type === 'comment_on_post'
        ? `perf-comment-${String(i % DETAIL_COMMENT_COUNT).padStart(3, '0')}`
        : null;
    return {
      id: `perf-notif-${String(i).padStart(3, '0')}`,
      recipient_id: memberId,
      type,
      actor_id: actorId,
      actor_profile_image: AVATAR_URL,
      board_id: PRIMARY_BOARD_ID,
      post_id: post.id,
      comment_id: commentId,
      message: messageFor[type],
      read: i >= 8, // first 8 unread, rest read
      created_at: isoFromEpoch(i * 60),
    };
  });
  await upsert('notifications', rows);
  console.log(`  ${NOTIFICATION_COUNT} notifications for member`);
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  assertLocalSupabase();
  console.log('Seeding FROZEN perf fixture into local Supabase...\n');

  const userIds = await loadUserIds();
  const memberId = userIds[MEMBER_EMAIL];
  const actorId = userIds[ACTOR_EMAIL];

  await seedBoards();
  await seedMembershipsAndProfiles(memberId, actorId);
  const posts = await seedPosts(memberId);
  const detailPostId = posts[0].id; // newest post is the detail-route target
  await seedComments(actorId, detailPostId);
  await seedNotifications(memberId, actorId, posts);

  const manifest = {
    primaryBoardId: PRIMARY_BOARD_ID,
    secondaryBoardIds: SECONDARY_BOARD_IDS,
    postIds: posts.map((p) => p.id),
    detailPostId,
    memberUserId: memberId,
    actorUserId: actorId,
    routes: {
      root: '/',
      boardFeed: `/board/${PRIMARY_BOARD_ID}`,
      postDetail: `/board/${PRIMARY_BOARD_ID}/post/${detailPostId}`,
      notifications: '/notifications',
      boardsList: '/boards/list',
    },
  };
  const outPath = path.join(__dirname, '..', 'tests', 'fixtures', 'perf-fixture.json');
  await fs.writeFile(outPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest written to ${outPath}`);
  console.log('Perf fixture seeding complete.');
}

main().catch((err) => {
  console.error('Perf fixture seeding failed:', err);
  process.exit(1);
});
