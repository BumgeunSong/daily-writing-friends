# Firebase → Supabase Migration Plan

**Project**: Daily Writing Friends
**Document Version**: 1.1
**Created**: 2026-01-04
**Last Updated**: 2026-01-17
**Branch**: `feat/supabase-migration-3`

---

## Current Status (Handoff Notes)

**As of 2026-01-17:**

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: Schema | ✅ Complete | Tables & indexes created in Supabase |
| Phase 1: Backfill | ✅ Complete | All data migrated except notifications |
| Phase 2: Dual-Write | ✅ Deployed | Firestore writes sync to Supabase |
| Phase 3: Remove Fan-out | ⏳ Pending | |
| Phase 4: Notifications | ⏳ In Progress | Dual-write running, wait 7 days |
| Phase 5: Shadow Reads | ⏳ Pending | |
| Phase 6: Switch Reads | ⏳ Pending | |
| Phase 7: Freeze Firestore | ⏳ Pending | |

**Next Steps:**
1. Monitor dual-write for 7 days (until 2026-01-24)
2. Verify data consistency between Firestore and Supabase
3. Proceed to Phase 3 (remove activity fan-out functions)

**Key Commits:**
- `6620977` - Phase 2 Dual-Write 구현: Firestore 쓰기 작업을 Supabase에 동기화
- `af0bf1c` - PR 리뷰 피드백 반영

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Migration Principles](#migration-principles)
3. [Current Architecture Analysis](#current-architecture-analysis)
4. [Phase 0: Prepare Supabase Schema](#phase-0-prepare-supabase-schema)
5. [Phase 1: Backfill Firestore → Supabase](#phase-1-backfill-firestore--supabase)
6. [Phase 2: Introduce Dual-Write](#phase-2-introduce-dual-write)
7. [Phase 3: Replace Firebase Relationship Functions](#phase-3-replace-firebase-relationship-functions)
8. [Phase 4: Migrate Notifications](#phase-4-migrate-notifications)
9. [Phase 5: Shadow Reads](#phase-5-shadow-reads)
10. [Phase 6: Switch Reads Gradually](#phase-6-switch-reads-gradually)
11. [Phase 7: Stop Dual-Write & Freeze Firestore](#phase-7-stop-dual-write--freeze-firestore)
12. [Auth & Security Strategy](#auth--security-strategy)
13. [Verification Commands & Scripts](#verification-commands--scripts)
14. [Done Checklist](#done-checklist)

---

## Executive Summary

This document outlines the migration strategy from Firebase (Firestore) to Supabase (Postgres) for the Daily Writing Friends application. The migration uses a **dual-write approach** to ensure data consistency and enable safe rollback at any point.

**Key decisions:**
- Firebase Auth remains (no auth migration)
- Postgres becomes the canonical data source
- Activity fan-out tables (`postings`, `commentings`, `replyings`) are **removed** and replaced with indexed queries
- Notifications remain materialized (explicit table with server-side writes)
- Dual-write is temporary and verifiable

---

## Migration Principles

| Principle | Description |
|-----------|-------------|
| **Canonical source moves to Postgres** | `posts`, `comments`, `replies`, `likes`, `reactions` are single-source tables |
| **No more activity fan-out tables** | `users/{uid}/postings`, `commentings`, `replyings` are **deleted concepts** — replaced by indexed queries or views |
| **Notifications stay materialized** | Explicit `notifications` table, written server-side, idempotent |
| **Firebase Auth stays** | Client → Firebase ID token → API/Edge Function → Postgres |
| **Dual-write is temporary and verifiable** | Correctness > speed |

---

## Current Architecture Analysis

### Firestore Collections Structure

```
boards/{boardId}
├── posts/{postId}
│   ├── comments/{commentId}
│   │   └── replies/{replyId}
│   └── likes/{likeId}

users/{uid}
├── notifications/{notificationId}
├── postings/{postingId}           ← TO BE REMOVED
├── commentings/{commentingId}     ← TO BE REMOVED
├── replyings/{replyingId}         ← TO BE REMOVED
├── blockedUsers/{userId}
├── blockedByUsers/{userId}
└── writingHistories/{historyId}
```

### Current Firebase Functions (to be migrated/removed)

| Function | Category | Migration Action |
|----------|----------|------------------|
| `createPosting` | Activity Fan-out | **DELETE** - replace with SQL query |
| `createCommenting` | Activity Fan-out | **DELETE** - replace with SQL query |
| `createReplying` | Activity Fan-out | **DELETE** - replace with SQL query |
| `updatePosting` | Activity Fan-out | **DELETE** |
| `updateCommenting` | Activity Fan-out | **DELETE** |
| `updateReplying` | Activity Fan-out | **DELETE** |
| `onCommentCreated` | Notification | **MIGRATE** - insert into `notifications` table |
| `onLikeCreatedOnPost` | Notification | **MIGRATE** - insert into `notifications` table |
| `onReplyCreatedOnComment` | Notification | **MIGRATE** - insert into `notifications` table |
| `onReplyCreatedOnPost` | Notification | **MIGRATE** - insert into `notifications` table |
| `onReactionCreatedOnComment` | Notification | **MIGRATE** - insert into `notifications` table |
| `onReactionCreatedOnReply` | Notification | **MIGRATE** - insert into `notifications` table |
| `incrementCommentCount` | Counter | **MIGRATE** - use Postgres triggers or transactional updates |
| `incrementLikeCount` | Counter | **MIGRATE** - use Postgres triggers or transactional updates |
| `incrementRepliesCount` | Counter | **MIGRATE** - use Postgres triggers or transactional updates |
| `updateEngagementScore` | Computed | **MIGRATE** - use Postgres triggers or computed column |

### Current Data Models

**Post** (canonical: `src/post/model/Post.ts`):
```typescript
interface Post {
  id: string;
  boardId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt?: Timestamp;
  countOfComments: number;  // Note: legacy 'comments' field exists in functions/types but is unused
  countOfReplies: number;
  countOfLikes: number;
  engagementScore?: number;
  updatedAt?: Timestamp;
  weekDaysFromFirstDay?: number;
}
```

> **Legacy Field**: The functions type `Post` has a `comments: number` field alongside `countOfComments`.
> Only `countOfComments` is actively used. Postgres schema uses only `count_of_comments`.

**Comment** (from `functions/src/shared/types/Comment.ts`):
```typescript
interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userProfileImage: string;
  createdAt: Timestamp;
}
```

**Reply** (canonical: client version using `firebase/firestore`):
```typescript
import { Timestamp } from 'firebase/firestore';

interface Reply {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userProfileImage: string;
  createdAt: Timestamp;
}
```

> **Note**: The canonical Reply interface uses `firebase/firestore` Timestamp (client SDK),
> not `firebase-admin/firestore`. Postgres stores as `TIMESTAMPTZ`.

**Notification** (from `functions/src/shared/types/Notification.ts`):
```typescript
interface Notification {
  type: NotificationType;
  boardId: string;
  postId: string;
  commentId?: string;
  replyId?: string;
  reactionId?: string;
  likeId?: string;
  fromUserId: string;
  fromUserProfileImage?: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
}

enum NotificationType {
  COMMENT_ON_POST = 'comment_on_post',
  REPLY_ON_COMMENT = 'reply_on_comment',
  REPLY_ON_POST = 'reply_on_post',
  REACTION_ON_COMMENT = 'reaction_on_comment',
  REACTION_ON_REPLY = 'reaction_on_reply',
  LIKE_ON_POST = 'like_on_post',
}
```

---

## Phase 0: Prepare Supabase Schema

### Supabase Tables

Create canonical tables with **Firestore document IDs as primary keys** (TEXT).

> **Note on ID Column Type**: Firestore auto-generated document IDs are 20 alphanumeric characters.
> We use `TEXT` rather than `VARCHAR(20)` for flexibility, but all IDs should be ~20 chars in practice.
> This applies to: `boards.id`, `users.id`, `posts.id`, `comments.id`, `replies.id`, `likes.id`, `reactions.id`.

```sql
-- Boards table
CREATE TABLE boards (
  id TEXT PRIMARY KEY,  -- Firestore document ID
  title TEXT NOT NULL,
  description TEXT,
  first_day TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table (profile data only - auth stays in Firebase)
CREATE TABLE users (
  id TEXT PRIMARY KEY,  -- Firebase Auth UID
  real_name TEXT,
  nickname TEXT,
  email TEXT,
  profile_photo_url TEXT,
  bio TEXT,
  phone_number TEXT,
  referrer TEXT,
  recovery_status TEXT CHECK (recovery_status IN ('none', 'eligible', 'partial', 'success')),
  timezone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User board permissions
CREATE TABLE user_board_permissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'write')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, board_id)
);

-- Posts table
CREATE TABLE posts (
  id TEXT PRIMARY KEY,  -- Firestore document ID
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  count_of_comments INTEGER NOT NULL DEFAULT 0,
  count_of_replies INTEGER NOT NULL DEFAULT 0,
  count_of_likes INTEGER NOT NULL DEFAULT 0,
  engagement_score NUMERIC NOT NULL DEFAULT 0,
  week_days_from_first_day INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
  id TEXT PRIMARY KEY,  -- Firestore document ID
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_profile_image TEXT,
  content TEXT NOT NULL,
  count_of_replies INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Replies table
CREATE TABLE replies (
  id TEXT PRIMARY KEY,  -- Firestore document ID
  comment_id TEXT NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,  -- Denormalized for query efficiency
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_profile_image TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Likes table
CREATE TABLE likes (
  id TEXT PRIMARY KEY,  -- Firestore document ID
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_profile_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Reactions table (for comments and replies)
CREATE TABLE reactions (
  id TEXT PRIMARY KEY,  -- Firestore document ID
  entity_type TEXT NOT NULL CHECK (entity_type IN ('comment', 'reply')),
  entity_id TEXT NOT NULL,  -- comment_id or reply_id
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,  -- emoji or reaction type
  user_name TEXT,
  user_profile_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, user_id)
);

-- Blocks table
CREATE TABLE blocks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

-- Notifications table (materialized inbox)
CREATE TABLE notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'comment_on_post',
    'reply_on_comment',
    'reply_on_post',
    'reaction_on_comment',
    'reaction_on_reply',
    'like_on_post'
  )),
  actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_profile_image TEXT,
  board_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  comment_id TEXT NOT NULL DEFAULT '',  -- Empty string instead of NULL for unique constraint
  reply_id TEXT NOT NULL DEFAULT '',    -- Empty string instead of NULL for unique constraint
  reaction_id TEXT,
  like_id TEXT,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency constraint: one notification per unique event
-- Using DEFAULT '' for nullable fields to enable simple UNIQUE constraint
CREATE UNIQUE INDEX idx_notifications_idempotency
  ON notifications(recipient_id, type, post_id, comment_id, reply_id, actor_id);

-- Idempotent write operations log
CREATE TABLE write_ops (
  op_id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX idx_write_ops_created_at ON write_ops(created_at);

-- Cleanup strategy: Delete records older than 30 days
-- Run this as a scheduled job (e.g., daily via pg_cron or external scheduler)
-- DELETE FROM write_ops WHERE created_at < NOW() - INTERVAL '30 days';
```

> **Cleanup Strategy for `write_ops`**: This table grows with every write operation.
> Implement a scheduled cleanup job to delete records older than 30 days:
> - Use `pg_cron` extension: `SELECT cron.schedule('cleanup-write-ops', '0 3 * * *', $$DELETE FROM write_ops WHERE created_at < NOW() - INTERVAL '30 days'$$);`
> - Or run via external scheduler (Cloud Scheduler, cron job) calling a cleanup endpoint

### Required Indexes (Non-negotiable)

```sql
-- Posts indexes
CREATE INDEX idx_posts_board_created ON posts(board_id, created_at DESC, id DESC);
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC, id DESC);
CREATE INDEX idx_posts_board_engagement ON posts(board_id, engagement_score DESC, created_at DESC, id DESC);

-- Comments indexes
CREATE INDEX idx_comments_user_created ON comments(user_id, created_at DESC);
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at ASC);

-- Replies indexes
CREATE INDEX idx_replies_user_created ON replies(user_id, created_at DESC);
CREATE INDEX idx_replies_comment_created ON replies(comment_id, created_at ASC);

-- Notifications index
CREATE INDEX idx_notifications_recipient_created ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id, created_at DESC) WHERE read = FALSE;

-- Blocks indexes
-- Note: UNIQUE(blocker_id, blocked_id) already creates an index on that pair
CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);

-- Likes index
CREATE INDEX idx_likes_post ON likes(post_id);
CREATE INDEX idx_likes_user ON likes(user_id);

-- User board permissions index
CREATE INDEX idx_permissions_user ON user_board_permissions(user_id);
CREATE INDEX idx_permissions_board ON user_board_permissions(board_id);
```

### Verification Commands for Phase 0

```bash
# Verify tables exist
psql "$DATABASE_URL" -c "\dt"

# Verify table structures
psql "$DATABASE_URL" -c "\d+ posts"
psql "$DATABASE_URL" -c "\d+ comments"
psql "$DATABASE_URL" -c "\d+ replies"
psql "$DATABASE_URL" -c "\d+ notifications"

# Verify indexes exist
psql "$DATABASE_URL" -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('posts','comments','replies','notifications','blocks');"

# Verify feed queries use indexes (EXPLAIN ANALYZE)
psql "$DATABASE_URL" -c "EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM posts
WHERE board_id = 'TEST_BOARD_ID'
ORDER BY created_at DESC, id DESC
LIMIT 20;"
```

**Pass condition:**
- All tables created successfully
- All indexes created successfully
- EXPLAIN shows **Index Scan** (not Sequential Scan) for common queries

---

## Phase 1: Backfill Firestore → Supabase

### Backfill Order

1. `boards`, `users`, `user_board_permissions`
2. `posts`
3. `comments`, `replies`
4. `likes`, `reactions`
5. `blocks`

> **Note**: Notifications are NOT backfilled. Stale notifications have no value.
> New notifications will accumulate via dual-write (Phase 2/4) over 7 days before cutover.

### Backfill Scripts

Create scripts in `scripts/migration/`:

```
scripts/migration/
├── export-firestore.ts       # Export Firestore collections to JSON
├── transform-data.ts         # Flatten nested data, convert timestamps
├── import-to-postgres.ts     # Import JSON to Postgres
├── reconcile/
│   ├── counts.ts            # Compare row counts
│   └── integrity.ts         # Check referential integrity
└── sql/
    └── integrity_checks.sql # SQL integrity validation queries
```

### Data Transformation Rules

```typescript
// Transform Firestore Timestamp to ISO string
function transformTimestamp(firestoreTimestamp: admin.firestore.Timestamp): string {
  return firestoreTimestamp.toDate().toISOString();
}

// Flatten nested Firestore paths
// boards/{boardId}/posts/{postId} → posts table with board_id column
// users/{uid}/notifications/{id} → notifications table with recipient_id column
```

### Verification Commands for Phase 1

```bash
# Run counts reconciliation
node scripts/migration/reconcile/counts.ts --days 30  # or use --date-from/--date-to for specific range

# Run integrity checks
psql "$DATABASE_URL" -f scripts/migration/sql/integrity_checks.sql
```

**SQL Integrity Checks** (`scripts/migration/sql/integrity_checks.sql`):

```sql
-- Orphan comments (should be 0)
SELECT 'orphan_comments' as check_name, COUNT(*) as count
FROM comments c
LEFT JOIN posts p ON p.id = c.post_id
WHERE p.id IS NULL;

-- Orphan replies (should be 0)
SELECT 'orphan_replies' as check_name, COUNT(*) as count
FROM replies r
LEFT JOIN comments c ON c.id = r.comment_id
WHERE c.id IS NULL;

-- Orphan likes (should be 0)
SELECT 'orphan_likes' as check_name, COUNT(*) as count
FROM likes l
LEFT JOIN posts p ON p.id = l.post_id
WHERE p.id IS NULL;

-- Orphan notifications (should be 0)
SELECT 'orphan_notifications' as check_name, COUNT(*) as count
FROM notifications n
LEFT JOIN users u ON u.id = n.recipient_id
WHERE u.id IS NULL;

-- Posts with mismatched comment counts (optimized with JOIN + GROUP BY)
SELECT 'comment_count_mismatch' as check_name, COUNT(*) as count
FROM (
  SELECT p.id, p.count_of_comments, COALESCE(c.actual_count, 0) as actual_count
  FROM posts p
  LEFT JOIN (
    SELECT post_id, COUNT(*) as actual_count
    FROM comments
    GROUP BY post_id
  ) c ON c.post_id = p.id
  WHERE p.count_of_comments != COALESCE(c.actual_count, 0)
) mismatched;

-- Posts with mismatched reply counts
SELECT 'reply_count_mismatch' as check_name, COUNT(*) as count
FROM (
  SELECT p.id, p.count_of_replies, COALESCE(r.actual_count, 0) as actual_count
  FROM posts p
  LEFT JOIN (
    SELECT post_id, COUNT(*) as actual_count
    FROM replies
    GROUP BY post_id
  ) r ON r.post_id = p.id
  WHERE p.count_of_replies != COALESCE(r.actual_count, 0)
) mismatched;
```

**Pass condition:**
- Row counts match between Firestore and Postgres
- Posts per board/day match
- Posts per author/day match
- All integrity checks return 0

---

## Phase 2: Introduce Dual-Write

### Dual-Write Architecture

Every new write goes to:
1. Firestore (current system) - for rollback safety
2. Supabase (new system) - the future canonical source

### Idempotency Implementation (Mandatory)

Generate deterministic `op_id` per write operation:

```typescript
// Generate deterministic operation ID
function generateOpId(eventType: string, entityId: string, timestamp: number): string {
  return `${eventType}_${entityId}_${timestamp}`;
}

// Idempotent write wrapper using RPC for atomic check-and-execute
// This avoids race conditions by using a database function

// First, create the database function:
/*
CREATE OR REPLACE FUNCTION try_acquire_write_lock(p_op_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  inserted BOOLEAN;
BEGIN
  INSERT INTO write_ops (op_id)
  VALUES (p_op_id)
  ON CONFLICT (op_id) DO NOTHING
  RETURNING TRUE INTO inserted;

  RETURN COALESCE(inserted, FALSE);
END;
$$ LANGUAGE plpgsql;
*/

async function idempotentWrite(opId: string, writeOperation: () => Promise<void>): Promise<void> {
  // Atomically try to acquire the write lock
  const { data: acquired, error } = await supabase
    .rpc('try_acquire_write_lock', { p_op_id: opId });

  if (error) {
    throw new Error(`Failed to acquire write lock for ${opId}: ${error.message}`);
  }

  // If we didn't acquire the lock, operation was already processed
  if (!acquired) {
    console.log(`Operation ${opId} already processed, skipping`);
    return;
  }

  // We acquired the lock, execute the write operation
  try {
    await writeOperation();
  } catch (writeError) {
    // If write fails, we should ideally remove the lock to allow retry
    // But this depends on your retry strategy - leaving lock prevents duplicate attempts
    console.error(`Write operation failed for ${opId}:`, writeError);
    throw writeError;
  }
}
```

### Dual-Write Wrapper for Firebase Functions

Modify existing Firebase Functions to dual-write:

```typescript
// Example: createPosting with dual-write
export const createPosting = onDocumentCreated(
  'boards/{boardId}/posts/{postId}',
  async (event) => {
    const postData = event.data?.data() as Post;
    if (!postData) return null;

    const opId = `post_${event.params.postId}_${Date.now()}`;

    // Dual-write to Supabase (idempotent)
    await idempotentWrite(opId, async () => {
      await supabase.from('posts').insert({
        id: event.params.postId,
        board_id: event.params.boardId,
        author_id: postData.authorId,
        author_name: postData.authorName,
        title: postData.title,
        content: postData.content || '',
        created_at: postData.createdAt?.toDate().toISOString() || new Date().toISOString(),
      });
    });

    // Original Firestore activity fan-out (keep during dual-write)
    // ... existing code ...

    return null;
  }
);
```

### Verification Commands for Phase 2

```bash
# Test idempotency - run same write twice
node scripts/tests/idempotency.test.ts

# Compare recent writes (last 30 minutes)
node scripts/migration/reconcile/recent_writes.ts --minutes 30
```

**Idempotency Test** (`scripts/tests/idempotency.test.ts`):

```typescript
describe('Dual-write idempotency', () => {
  const testPostId = `test-post-${Date.now()}`;

  afterEach(async () => {
    // Cleanup test data
    await supabase.from('posts').delete().eq('id', testPostId);
    await supabase.from('write_ops').delete().like('op_id', 'test_%');
  });

  it('should only create one record when same op_id is used twice', async () => {
    const opId = `test_${Date.now()}`;
    const testPost = {
      id: testPostId,
      board_id: 'test-board',
      author_id: 'test-user',
      author_name: 'Test',
      title: 'Test Post',
      content: '',
    };

    // First write - should succeed
    await idempotentWrite(opId, () => supabase.from('posts').insert(testPost));

    // Second write with same opId - should be skipped
    await idempotentWrite(opId, () => supabase.from('posts').insert(testPost));

    // Verify write_ops has exactly 1 entry
    const { data: writeOps } = await supabase.from('write_ops').select().eq('op_id', opId);
    expect(writeOps?.length).toBe(1);

    // Verify posts has exactly 1 entry
    const { data: posts } = await supabase.from('posts').select().eq('id', testPostId);
    expect(posts?.length).toBe(1);
  });

  it('should handle concurrent writes with same op_id', async () => {
    const opId = `test_concurrent_${Date.now()}`;
    const testPost = {
      id: testPostId,
      board_id: 'test-board',
      author_id: 'test-user',
      author_name: 'Test',
      title: 'Test Post',
      content: '',
    };

    // Use a barrier pattern to ensure true concurrency
    // Both operations wait at the barrier, then race to the database
    let barrier = 2;
    const waitForBarrier = () => new Promise<void>(resolve => {
      barrier--;
      const check = () => {
        if (barrier <= 0) resolve();
        else setTimeout(check, 1);
      };
      check();
    });

    const concurrentWrite = async () => {
      await waitForBarrier(); // Wait for both to be ready
      return idempotentWrite(opId, () => supabase.from('posts').insert(testPost));
    };

    // Launch truly concurrent writes
    const results = await Promise.allSettled([
      concurrentWrite(),
      concurrentWrite(),
    ]);

    // Both should complete (one succeeds, one skips) - neither should throw
    const successes = results.filter(r => r.status === 'fulfilled');
    expect(successes.length).toBe(2); // Both complete without error

    // Final state: exactly 1 write_ops entry, exactly 1 post
    const { data: writeOps } = await supabase.from('write_ops').select().eq('op_id', opId);
    const { data: posts } = await supabase.from('posts').select().eq('id', testPostId);

    expect(writeOps?.length).toBe(1);
    expect(posts?.length).toBe(1);
  });

  it('should handle high concurrency (10 simultaneous writes)', async () => {
    const opId = `test_stress_${Date.now()}`;
    const testPost = {
      id: testPostId,
      board_id: 'test-board',
      author_id: 'test-user',
      author_name: 'Test',
      title: 'Test Post',
      content: '',
    };

    const CONCURRENCY = 10;
    let barrier = CONCURRENCY;
    const waitForBarrier = () => new Promise<void>(resolve => {
      barrier--;
      const check = () => {
        if (barrier <= 0) resolve();
        else setTimeout(check, 1);
      };
      check();
    });

    // Launch many concurrent writes
    const results = await Promise.allSettled(
      Array(CONCURRENCY).fill(null).map(async () => {
        await waitForBarrier();
        return idempotentWrite(opId, () => supabase.from('posts').insert(testPost));
      })
    );

    // All should complete without throwing
    const successes = results.filter(r => r.status === 'fulfilled');
    expect(successes.length).toBe(CONCURRENCY);

    // Final state: exactly 1 of each
    const { data: writeOps } = await supabase.from('write_ops').select().eq('op_id', opId);
    const { data: posts } = await supabase.from('posts').select().eq('id', testPostId);

    expect(writeOps?.length).toBe(1);
    expect(posts?.length).toBe(1);
  });
});
```

**Pass condition:**
- `write_ops` table has exactly **one** entry per operation ID
- `posts` table has exactly **one** record (no duplicates from retries or concurrency)
- IDs match between Firestore and Postgres for recent writes
- No idempotency-related errors in logs

---

## Phase 3: Replace Firebase Relationship Functions

### Functions to DELETE

These activity fan-out functions are replaced by indexed SQL queries:

| Firebase Function | Supabase Replacement |
|-------------------|---------------------|
| `createPosting` | `SELECT * FROM posts WHERE author_id = ?` |
| `createCommenting` | `SELECT * FROM comments WHERE user_id = ?` |
| `createReplying` | `SELECT * FROM replies WHERE user_id = ?` |
| `updatePosting` | N/A (no fan-out needed) |
| `updateCommenting` | N/A (no fan-out needed) |
| `updateReplying` | N/A (no fan-out needed) |

### Unified "My Activity" View (Optional)

```sql
CREATE VIEW user_activity AS
SELECT
  'post' as activity_type,
  id as entity_id,
  author_id as user_id,
  title as preview,
  board_id,
  NULL as post_id,
  created_at
FROM posts
UNION ALL
SELECT
  'comment' as activity_type,
  c.id as entity_id,
  c.user_id,
  LEFT(c.content, 100) as preview,
  p.board_id,
  c.post_id,
  c.created_at
FROM comments c
JOIN posts p ON p.id = c.post_id
UNION ALL
SELECT
  'reply' as activity_type,
  r.id as entity_id,
  r.user_id,
  LEFT(r.content, 100) as preview,
  p.board_id,
  r.post_id,
  r.created_at
FROM replies r
JOIN posts p ON p.id = r.post_id;  -- Use denormalized post_id, skip comments join

-- Query user activity
SELECT * FROM user_activity
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 20;
```

### Verification Commands for Phase 3

```bash
# Static check: ensure no references to fan-out collections
# Note: quotes are required to prevent shell from interpreting | as pipe
rg -n "(postings|commentings|replyings)" src functions scripts --type ts

# E2E test: verify "My posts" page works without fan-out
pnpm test:e2e --filter my-posts
```

**Pass condition:**
- No remaining references to `postings`, `commentings`, `replyings` in codebase
- "My posts" page loads correctly from SQL query
- E2E tests pass with fan-out disabled

---

## Phase 4: Migrate Notifications

### Strategy: No Backfill, Dual-Write Only

**Key insight**: Stale notifications have no user value. Users don't care about week-old notifications.

**Approach**:
1. Start dual-write for notifications (as part of Phase 2)
2. Run dual-write for **7 days** minimum
3. After 7 days, all relevant notifications exist in Supabase
4. Switch reads to Supabase, delete Firestore notification data

### Notification Table Design

The notifications table uses a unique index for idempotency:

```sql
-- comment_id and reply_id use DEFAULT '' instead of NULL
-- This enables a simple unique index without COALESCE expressions
CREATE UNIQUE INDEX idx_notifications_idempotency
  ON notifications(recipient_id, type, post_id, comment_id, reply_id, actor_id);
```

### Notification Insert Logic

```typescript
// Insert notification (idempotent via INSERT ... ON CONFLICT DO NOTHING)
async function createNotification(notification: NotificationInsert): Promise<void> {
  // Ensure empty strings for optional fields (not NULL)
  const normalizedNotification = {
    ...notification,
    comment_id: notification.comment_id || '',
    reply_id: notification.reply_id || '',
  };

  const { error } = await supabase
    .from('notifications')
    .insert(normalizedNotification);

  if (error) {
    // 23505 = unique constraint violation (duplicate key), safe to ignore
    if (error.code === '23505') {
      console.log('Notification already exists, skipping');
      return;
    }
    throw error;
  }
}
```

### Dual-Write Mapping

| Firebase Function | Postgres Notification Insert |
|-------------------|------------------------------|
| `onCommentCreated` | `type: 'comment_on_post'`, `recipient_id: post.author_id` |
| `onLikeCreatedOnPost` | `type: 'like_on_post'`, `recipient_id: post.author_id` |
| `onReplyCreatedOnComment` | `type: 'reply_on_comment'`, `recipient_id: comment.user_id` |
| `onReplyCreatedOnPost` | `type: 'reply_on_post'`, `recipient_id: post.author_id` |
| `onReactionCreatedOnComment` | `type: 'reaction_on_comment'`, `recipient_id: comment.user_id` |
| `onReactionCreatedOnReply` | `type: 'reaction_on_reply'`, `recipient_id: reply.user_id` |

### Verification Commands for Phase 4

```bash
# Verify dual-write is working (check last 24h of notifications)
node scripts/migration/reconcile/notifications.ts --hours 24

# Test notification deduplication
node scripts/tests/notifications_dedupe.test.ts
```

**Pass condition:**
- Dual-write running for 7+ days
- Recent notifications (last 7 days) exist in both Firestore and Supabase
- No duplicate notifications from retries

---

## Phase 5: Shadow Reads

Shadow reads compare Firestore and Supabase results to catch silent bugs before cutover.

### Shadow Read Implementation

```typescript
// Shadow read for feed endpoints
async function shadowReadFeed(
  boardId: string,
  feedType: 'recent' | 'best',
  limit: number
): Promise<ShadowReadResult> {
  const [firestoreIds, postgresIds] = await Promise.all([
    fetchFeedFromFirestore(boardId, feedType, limit),
    fetchFeedFromPostgres(boardId, feedType, limit),
  ]);

  const diff = compareFeedIds(firestoreIds, postgresIds);

  if (diff.hasMismatch) {
    // Log to migration_diffs table and Sentry
    await logShadowDiff({
      feed_type: feedType,
      board_id: boardId,
      firestore_ids: firestoreIds,
      postgres_ids: postgresIds,
      missing_in_postgres: diff.missingInPostgres,
      missing_in_firestore: diff.missingInFirestore,
      order_mismatch: diff.orderMismatch,
    });
  }

  return { firestoreIds, postgresIds, diff };
}
```

### Migration Diffs Table

```sql
CREATE TABLE migration_diffs (
  id SERIAL PRIMARY KEY,
  feed_type TEXT NOT NULL,
  board_id TEXT,
  firestore_ids TEXT[],
  postgres_ids TEXT[],
  missing_in_postgres TEXT[],
  missing_in_firestore TEXT[],
  order_mismatch BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying during reconciliation
CREATE INDEX idx_migration_diffs_board ON migration_diffs(board_id, created_at DESC);
CREATE INDEX idx_migration_diffs_feed_type ON migration_diffs(feed_type, created_at DESC);
```

### Daily Reconciliation Job

```typescript
// Run daily to catch drift
async function dailyReconciliation() {
  const boards = await getAllBoards();

  for (const board of boards) {
    // Compare posts per day
    const postsPerDay = await comparePostsPerDay(board.id, 30);

    // Compare top 3 posts last 7 days
    const topPosts = await compareTopPosts(board.id, 7, 3);

    // Log any mismatches
    if (postsPerDay.hasDiff || topPosts.hasDiff) {
      await logReconciliationDiff({ board, postsPerDay, topPosts });
    }
  }
}
```

### Verification Commands for Phase 5

```bash
# Run shadow reads for sample requests
node scripts/shadow/run_shadow_reads.ts --samples 200 --feed recent --board-id XXX

# Reconcile top posts
node scripts/migration/reconcile/top_posts.ts --days 7 --limit 3 --board-id XXX

# Run daily audit
node scripts/migration/reconcile/daily_audit.ts --date today  # or specific date YYYY-MM-DD
```

**Pass condition:**
- Mismatch rate is below threshold (ideally 0%)
- Same 3 IDs in same order for "best posts last 7 days"
- If non-zero diff, all mismatches are explained and logged

---

## Phase 6: Switch Reads Gradually

### Feature Flag Configuration

```typescript
// Environment variable or remote config
type ReadSource = 'firestore' | 'supabase' | 'shadow';

const READ_SOURCE: ReadSource = process.env.READ_SOURCE || 'firestore';

// Read source selector
async function fetchFeed(boardId: string, feedType: string, limit: number) {
  switch (READ_SOURCE) {
    case 'supabase':
      return fetchFeedFromPostgres(boardId, feedType, limit);
    case 'shadow':
      // Read from both, compare, return Firestore result
      await shadowReadFeed(boardId, feedType, limit);
      return fetchFeedFromFirestore(boardId, feedType, limit);
    case 'firestore':
    default:
      return fetchFeedFromFirestore(boardId, feedType, limit);
  }
}
```

### Gradual Rollout Order

1. **Stage 1**: Feature flag **Recent Posts (one board)** → Supabase
2. **Stage 2**: Expand to all Recent feeds
3. **Stage 3**: Switch User Posts (`/user/:id/posts`)
4. **Stage 4**: Switch Best Posts

### Rollback Rule

Reads must be switchable back to Firestore **instantly** via environment variable:

```bash
# Switch to Supabase
READ_SOURCE=supabase

# Rollback to Firestore
READ_SOURCE=firestore

# Enable shadow mode for debugging
READ_SOURCE=shadow
```

### Verification Commands for Phase 6

```bash
# Verify read source toggle works
curl -s "$APP_URL/healthz" | jq
curl -s "$APP_URL/debug/read-source"

# Run E2E tests with Supabase reads
READ_SOURCE=supabase pnpm test:e2e
```

### E2E Test Coverage

Minimum E2E tests required:

```typescript
describe('E2E with Supabase reads', () => {
  it('should load board feed', () => { /* ... */ });
  it('should load post detail', () => { /* ... */ });
  it('should create post', () => { /* ... */ });
  it('should like post', () => { /* ... */ });
  it('should comment on post', () => { /* ... */ });
  it('should reply to comment', () => { /* ... */ });
  it('should load notifications page', () => { /* ... */ });
  it('should load user profile with posts', () => { /* ... */ });
});
```

**Pass condition:**
- Read source toggles without redeploy
- All E2E tests pass under Supabase reads
- No errors in monitoring

---

## Phase 7: Stop Dual-Write & Freeze Firestore

### Pre-Cutover Checklist

Before disabling Firestore writes:

- [ ] Run "read-only with Supabase" in staging for 24+ hours
- [ ] Shadow diff rate is zero
- [ ] Notification rate matches expected
- [ ] Error rates are normal
- [ ] Daily audit shows zero critical diffs

### Cutover Steps

1. **Announce maintenance window** (if needed)
2. **Drain period** — handle in-flight writes safely (see below)
3. **Stop dual-write to Firestore** — modify functions to only write to Supabase
4. **Keep Firestore read-only** — for short rollback window (1-2 weeks)
5. **Monitor closely** — error rates, user reports
6. **Archive Firestore data** — export final backup
7. **Delete Firestore collections** — after rollback window expires

### Drain Period Protocol

Since cutover happens during maintenance window (night) with few users, use a **drain period** approach:

```
Timeline (maintenance window):

00:00  Start maintenance
       ├── Set WRITE_MODE=draining (reject new writes with "maintenance" message)
       ├── Wait 30-60 seconds for in-flight writes to complete
       └── All pending Cloud Functions finish executing

00:01  Deploy new functions (Supabase-only writes)
       ├── Set WRITE_MODE=normal
       └── Writes now go only to Supabase

00:02  Verify writes working
       └── Test create post, comment, like flows

00:05  End maintenance
```

**Implementation**:

```typescript
// Drain mode flag (environment variable or remote config)
const WRITE_MODE = process.env.WRITE_MODE || 'normal'; // 'normal' | 'draining'

// In API/Edge Function
if (WRITE_MODE === 'draining') {
  return new Response(JSON.stringify({
    error: 'maintenance',
    message: '잠시 후 다시 시도해주세요. (서버 점검 중)',
    retryAfter: 60,
  }), { status: 503, headers: { 'Retry-After': '60' } });
}
```

**Why drain period works**:
- Maintenance window has minimal traffic
- 30-60 second drain catches any in-flight writes
- No complex distributed locking needed
- Clear user feedback via 503 response

### Rollback Verification

Practice rollback before cutover:

```bash
# Flip to Firestore reads
READ_SOURCE=firestore

# Verify app still works
curl -s "$APP_URL/healthz"
pnpm test:e2e
```

**Pass condition:**
- Rollback is real and tested (not theoretical)
- App works correctly with Firestore reads

---

## Auth & Security Strategy

### During Migration

- Client sends **Firebase ID token** (unchanged)
- API/Edge Function **verifies token** via Firebase Admin SDK
- API performs **all Postgres writes** (not direct client access)
- RLS can be added later for defense-in-depth

### Token Verification in Edge Functions

```typescript
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const app = initializeApp({
  credential: cert(serviceAccount),
});

async function verifyToken(idToken: string): Promise<string> {
  const decodedToken = await getAuth(app).verifyIdToken(idToken);
  return decodedToken.uid;
}

// Supabase Edge Function
export async function handler(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const uid = await verifyToken(token);

  // Perform Postgres operations with verified uid
  // ...
}
```

### Why This Approach

- Avoids JWT incompatibilities between Firebase and Supabase
- No partial auth states
- Client-side DB exposure is minimized during migration
- Clean separation: Firebase Auth → API → Postgres

---

## Verification Commands & Scripts

### Directory Structure

```
scripts/
├── migration/
│   ├── export-firestore.ts
│   ├── transform-data.ts
│   ├── import-to-postgres.ts
│   └── reconcile/
│       ├── counts.ts
│       ├── recent_writes.ts
│       ├── top_posts.ts
│       └── daily_audit.ts
├── shadow/
│   └── run_shadow_reads.ts
├── tests/
│   ├── idempotency.test.ts
│   ├── notifications_dedupe.test.ts
│   └── notification_scenarios.test.ts
└── sql/
    └── integrity_checks.sql
```

### Quick Reference

| Phase | Verification Command |
|-------|---------------------|
| Phase 0 | `psql "$DATABASE_URL" -c "\dt"` |
| Phase 0 | `psql "$DATABASE_URL" -c "SELECT indexname FROM pg_indexes WHERE tablename = 'posts';"` |
| Phase 1 | `node scripts/migration/reconcile/counts.ts` |
| Phase 1 | `psql "$DATABASE_URL" -f scripts/sql/integrity_checks.sql` |
| Phase 2 | `node scripts/tests/idempotency.test.ts` |
| Phase 2 | `node scripts/migration/reconcile/recent_writes.ts --minutes 30` |
| Phase 3 | `rg -n "(postings\|commentings\|replyings)" src functions` |
| Phase 4 | `node scripts/tests/notification_scenarios.test.ts` |
| Phase 5 | `node scripts/shadow/run_shadow_reads.ts --samples 200` |
| Phase 5 | `node scripts/migration/reconcile/daily_audit.ts` |
| Phase 6 | `READ_SOURCE=supabase pnpm test:e2e` |
| Phase 7 | `READ_SOURCE=firestore pnpm test:e2e` (rollback test) |

---

## Done Checklist

Before declaring migration complete:

- [ ] **Phase 0**: Schema and indexes created, EXPLAIN shows index scans
- [ ] **Phase 1**: Backfill complete, row counts match, integrity checks pass
- [ ] **Phase 2**: Dual-write idempotent and stable, no duplicate records
- [ ] **Phase 3**: Activity fan-out functions removed, no references in code
- [ ] **Phase 4**: Notification dual-write running 7+ days, recent notifications in Supabase
- [ ] **Phase 5**: Shadow reads show no ordering/membership diffs
- [ ] **Phase 6**: Read paths behind feature flags, all E2E tests pass
- [ ] **Phase 7**: Rollback switch tested and works

### Final Sign-off

| Checkpoint | Status | Date | Notes |
|------------|--------|------|-------|
| Backfill complete (excl. notifications) | ✅ | 2026-01-17 | Phase 1 complete |
| Dual-write deployed | ✅ | 2026-01-17 | Phase 2 deployed, monitoring starts |
| Dual-write stable (7+ days) | ⏳ | | Target: 2026-01-24 |
| Notification dual-write (7+ days) | ⏳ | | Target: 2026-01-24, then delete stale |
| Shadow diff rate < 0.1% | | | |
| All E2E tests passing | | | |
| Rollback tested | | | |
| Firestore writes stopped | | | |
| Firestore archived | | | |

---

## Tooling Stack Summary

- **Supabase CLI**: Local Postgres, migrations, seed data
- **psql**: Fastest truth checking for schema/data
- **Node scripts**: Reconciliation, shadow diffs, idempotency tests
- **Playwright**: E2E tests for UI flows
- **`migration_diffs` table**: Ground truth of all mismatches
- **Sentry**: Error logging and alerting

---

## Appendix: Files to Create/Modify

### New Files

| Path | Purpose |
|------|---------|
| `supabase/migrations/001_initial_schema.sql` | Supabase schema migration |
| `scripts/migration/export-firestore.ts` | Export Firestore to JSON |
| `scripts/migration/transform-data.ts` | Transform data for Postgres |
| `scripts/migration/import-to-postgres.ts` | Import JSON to Postgres |
| `scripts/migration/reconcile/counts.ts` | Compare row counts |
| `scripts/migration/reconcile/recent_writes.ts` | Compare recent writes |
| `scripts/migration/reconcile/top_posts.ts` | Compare top posts |
| `scripts/migration/reconcile/daily_audit.ts` | Daily reconciliation |
| `scripts/shadow/run_shadow_reads.ts` | Shadow read comparison |
| `scripts/tests/idempotency.test.ts` | Idempotency tests |
| `scripts/tests/notification_scenarios.test.ts` | Notification tests |
| `scripts/sql/integrity_checks.sql` | SQL integrity queries |
| `src/shared/api/supabaseClient.ts` | Supabase client setup |
| `src/shared/api/dualWrite.ts` | Dual-write wrapper |
| `src/shared/api/readSource.ts` | Feature-flagged read source |

### Files to Modify

| Path | Changes |
|------|---------|
| `functions/src/postings/createPosting.ts` | Add dual-write to Supabase |
| `functions/src/commentings/createCommenting.ts` | Add dual-write, then DELETE |
| `functions/src/replyings/createReplying.ts` | Add dual-write, then DELETE |
| `functions/src/notifications/*.ts` | Add dual-write to Postgres |
| `src/post/api/post.ts` | Add read source toggle |
| `src/comment/api/comment.ts` | Add read source toggle |
| `src/user/api/user.ts` | Add read source toggle |
| `src/notification/api/notification.ts` | Add read source toggle |

---

*End of Migration Plan*
