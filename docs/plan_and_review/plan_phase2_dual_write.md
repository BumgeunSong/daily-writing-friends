# Phase 2: Dual-Write Implementation Plan

## Summary

Implement client-side dual-write to synchronize all Firestore writes to Supabase. Firestore remains primary; Supabase errors are logged but don't block users.

## Decisions

- **Location**: Client-side API layer (modify `src/**/api/*.ts`)
- **Rollout**: All 10 domains at once
- **Error handling**: Log to Sentry, don't block user
- **Missing tables**: Add `drafts` and `reviews` migrations

---

## Phase 1.9: Backfill Missing Data (Gap Between Export and Dual-Write)

### Problem

There's a time gap between:
- **Export completed**: 2026-01-15 ~21:52
- **Dual-write starts**: When Phase 2 deploys

Any data created/updated in this window exists in Firestore but NOT in Supabase.

### Solution

Run incremental sync script to find and migrate missing records.

**Script**: `scripts/migration/backfill-gap.ts`

```typescript
// Find records created after export timestamp
const EXPORT_TIMESTAMP = new Date('2026-01-15T21:52:00Z');

// For each collection:
// 1. Query Firestore for records with createdAt > EXPORT_TIMESTAMP
// 2. Check if they exist in Supabase
// 3. Insert missing records
```

### Collections to Check

| Collection | Firestore Path | Check Field |
|------------|----------------|-------------|
| users | `users` | `updatedAt` |
| posts | `boards/*/posts` | `createdAt` |
| comments | `boards/*/posts/*/comments` | `createdAt` |
| replies | `boards/*/posts/*/comments/*/replies` | `createdAt` |
| likes | `boards/*/posts/*/likes` | `createdAt` |
| reactions | `boards/*/posts/*/comments/*/reactions` | `createdAt` |
| blocks | `users/*/blockedUsers` | `blockedAt` |

### Execution

```bash
# 1. Run gap detection (dry-run)
npx tsx scripts/migration/backfill-gap.ts --dry-run

# 2. Review missing records count
# 3. Run actual backfill
npx tsx scripts/migration/backfill-gap.ts

# 4. Verify counts match
npx tsx scripts/migration/verify-counts.ts
```

### Timing

Run Phase 1.9 **before** deploying dual-write to ensure Supabase is fully caught up.

---

## Phase 2 Implementation Steps

### Step 1: Schema Migration (add missing tables)

**File**: `supabase/migrations/20260115000000_add_drafts_reviews.sql`

```sql
-- Drafts table
CREATE TABLE drafts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  content_json JSONB,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_drafts_user_board ON drafts(user_id, board_id, saved_at DESC);

-- Reviews table
CREATE TABLE reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_nickname TEXT,
  keep_text TEXT,
  problem_text TEXT,
  try_text TEXT,
  nps INTEGER,
  will_continue BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(board_id, reviewer_id)
);
```

### Step 2: Infrastructure (new files)

**File 1**: `src/shared/api/supabaseClient.ts`
- Browser-side Supabase client using `VITE_SUPABASE_ANON_KEY`
- Lazy initialization singleton

**File 2**: `src/shared/api/dualWrite.ts`
- `dualWrite()` helper with idempotency via `try_acquire_write_lock` RPC
- `dualWriteBatch()` for multi-record operations (block/unblock)
- Feature flag: `VITE_DUAL_WRITE_ENABLED`
- Sentry error logging (non-blocking)

**File 3**: `functions/src/shared/supabaseAdmin.ts`
- Server-side Supabase client for Cloud Functions (notifications)

### Step 3: Environment Variables

Add to `.env`:
```
VITE_SUPABASE_URL=https://mbnuuctaptbxytiiwxet.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_DUAL_WRITE_ENABLED=true
```

Add to `functions/.env`:
```
SUPABASE_URL=https://mbnuuctaptbxytiiwxet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

### Step 4: Wrap Write Operations (10 domains)

| Domain | File | Functions | Notes |
|--------|------|-----------|-------|
| User | `src/user/api/user.ts` | createUser, updateUser, deleteUser, blockUser, unblockUser | blockUser uses `dualWriteBatch` |
| Post | `src/post/utils/postUtils.ts` | createPost, updatePost | Also `usePostDelete.ts` for delete |
| Comment | `src/comment/api/comment.ts` | createComment, updateCommentToPost, deleteCommentToPost | Uses `addDoc` - capture ID |
| Reply | `src/comment/api/reply.ts` | createReply, updateReplyToComment, deleteReplyToComment | Uses `addDoc` - capture ID |
| Like | `src/post/api/like.ts` | createLike, deleteUserLike | |
| Reaction | `src/comment/api/reaction.ts` | createReaction, deleteReaction, deleteUserReaction | comment_id OR reply_id |
| Draft | `src/draft/utils/draftUtils.ts` | saveDraft, deleteDraft | |
| Review | `src/shared/utils/reviewUtils.ts` | createReview, addReviewToBoard | |
| Board | `src/board/utils/boardUtils.ts` | addUserToBoardWaitingList, removeUserFromBoardWaitingList | Array → join table |
| Notification | `functions/src/notifications/*.ts` | 5 Cloud Functions | Server-side dual-write |

### Step 5: Verification Script

**File**: `scripts/migration/verify-dual-write.ts`
- Compare recent writes (last N minutes) between Firestore and Supabase
- Report missing records in either direction
- Check `write_ops` table for recent operations

---

## Critical Files

1. `src/shared/api/supabaseClient.ts` (NEW)
2. `src/shared/api/dualWrite.ts` (NEW)
3. `src/user/api/user.ts` - most complex (batch operations)
4. `src/comment/api/comment.ts` - pattern for `addDoc` with generated IDs
5. `functions/src/notifications/commentOnPost.ts` - pattern for server-side

---

## dualWrite Helper API

```typescript
await dualWrite({
  entityType: 'post',
  operationType: 'create',
  entityId: postId,
  supabaseWrite: async () => {
    await supabase.from('posts').insert({ id: postId, ... });
  },
});
```

---

## Verification

```bash
# 1. Run app, create a post
# 2. Check Supabase dashboard for new record
# 3. Run verification script
npx tsx scripts/migration/verify-dual-write.ts --minutes 30

# 4. Check write_ops table
# Supabase SQL: SELECT * FROM write_ops ORDER BY created_at DESC LIMIT 20;

# 5. Check Sentry for dual_write errors (tag: dual_write.entity_type)
```

---

## Rollback

Set `VITE_DUAL_WRITE_ENABLED=false` → all writes go to Firestore only.

---

## Execution Order

1. **Phase 1.9**: Run `backfill-gap.ts` to sync missing data
2. **Step 1**: Run schema migration (add drafts, reviews tables)
3. **Step 2-3**: Create infrastructure files and env vars
4. **Step 4**: Wrap all write operations
5. **Step 5**: Deploy and verify with verification script
