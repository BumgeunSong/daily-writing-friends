# Firebase → Supabase Migration Progress

> **This is the single source of truth** for the Firestore → Supabase migration.
> For the original architectural plan, see [plan_firebase_supabase_migration.md](./plan_firebase_supabase_migration.md).

**Last Updated**: 2026-02-21
**Branch**: `migration-remove-fan-out`
**Status**: Phase 3 (Remove Fan-out) — complete, Phase 7 next

---

## Completed Work

### Phase 0: Supabase Schema ✅

**Commits:**
1. `4de7d47` - Supabase 초기 스키마 설정 (Phase 0)
2. `eb4db94` - Firestore → Supabase 마이그레이션 스크립트 추가 (Phase 1 준비)
3. `baa4037` - 스키마 정규화: 배열/중복 필드 제거
4. `baa5b57` - reactions 테이블 FK 제약조건 추가
5. `fe737a1` - 마이그레이션 진행 상황 문서화
6. `a251cbd` - Historical Identity: 성능을 위해 user_name/user_profile_image 유지
7. `630a617` - fix: onConflict 파라미터를 단일 컬럼만 지원하도록 수정
8. `8a88b5e` - refactor: 마이그레이션 통합 - Historical Identity를 초기 스키마에 포함
9. `0fae757` - fix: 스키마 정합성 개선 및 마이그레이션 비파괴적으로 수정
10. `f55acb4` - chore: 마이그레이션 스크립트 정리
11. `3adabc9` - fix: 마이그레이션 스크립트 안정성 개선
12. `d7d51ab` - fix: reactions 내보내기 시 null user_id 검증 추가
13. `ef5a6d3` - feat: reactions 테이블에 대한 orphan 체크 추가
14. `2526ce9` - feat: Summary Query에 모든 무결성 검사 포함

**Schema created (13 tables):**

| Table | Description |
|-------|-------------|
| `boards` | Board metadata |
| `users` | User profiles (Firebase UID as PK) |
| `user_board_permissions` | Board access control |
| `board_waiting_users` | Normalized from boards.waitingUsersIds |
| `posts` | Post content |
| `comments` | Comments on posts |
| `replies` | Replies to comments |
| `likes` | Post likes |
| `reactions` | Emoji reactions (FK to comments OR replies) |
| `blocks` | User blocking |
| `notifications` | Notification inbox |
| `write_ops` | Idempotency tracking for dual-write |
| `migration_diffs` | Shadow read verification |

**Key schema decisions:**
- Normalized `waiting_users_ids` array → `board_waiting_users` join table
- Removed `known_buddy_nickname/profile_photo_url` from users (keep FK only)
- Reactions use nullable FKs (`comment_id` OR `reply_id`) with CHECK constraint
- **Historical Identity**: Keep `user_name`, `user_profile_image` on comments/replies/likes/reactions
  - Rationale: Better read performance (no JOINs on PostDetailPage)
  - Preserves user identity at the moment of interaction
  - Trade-off: Profile updates won't reflect in past interactions (acceptable for writing community)

---

### Phase 1: Backfill Firestore → Supabase ✅

**Executed**: 2026-01-15

#### Step 1: Export Firestore to JSON ✅

**Command**: `npx tsx scripts/migration/export-firestore.ts`

**Issue encountered**: ESM module compatibility
- Original script used `__dirname` and `require()` which don't work in ESM
- **Fix**: Updated `scripts/migration/config.ts` to use:
  ```typescript
  import { fileURLToPath } from 'url';
  import { createRequire } from 'module';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const require = createRequire(import.meta.url);
  ```

**Export results:**
| Collection | Documents |
|------------|-----------|
| boards | 20 |
| users | 103 |
| posts | 3,823 |
| comments | 12,824 |
| replies | 8,649 |
| likes | 116 |
| reactions | 2,278 |
| notifications | 23,497 |
| blocks | 1 |

#### Step 2: Import to Supabase ✅

**Command**: `npx tsx scripts/migration/import-to-postgres.ts`

**Issue 1: Supabase project paused**
- Free-tier Supabase projects pause after inactivity
- All imports failed with `TypeError: fetch failed` (DNS NXDOMAIN)
- **Fix**: Resumed project in Supabase dashboard

**Issue 2: Reactions unique constraint violations**
- All 2,278 reactions failed with `duplicate key value violates unique constraint "idx_reactions_comment_user"`
- **Root cause**: Firestore allowed multiple reactions from same user on same comment (72 duplicates)
- Postgres unique constraint `(comment_id, user_id)` correctly rejects duplicates
- `upsert` with `onConflict: 'id'` doesn't handle composite unique constraints
- **Fix**: Created de-duplication script that keeps first occurrence
- **Result**: 2,206 unique reactions imported (72 duplicates removed)

**Issue 3: Notifications partial import**
- 9,497 imported, 14,000 failed
- Errors: duplicate idempotency keys + invalid notification types
- **Decision**: Skip notifications backfill entirely
  - Notifications older than 7 days have no value (time-sensitive)
  - Will use dual-write for 7 days instead
  - Simpler than debugging complex constraint violations

#### Step 3: Count Verification ✅

**Issue**: Original `counts.ts` script killed with exit code 137 (OOM)
- Script performed O(n³) nested Firestore queries
- 20 boards × 3,823 posts × 12,824 comments = ~25,000+ sequential queries
- **Fix**: Counted from exported JSON files instead

**Final verification:**
| Table | Firestore | Supabase | Status |
|-------|-----------|----------|--------|
| boards | 20 | 20 | ✅ |
| users | 103 | 103 | ✅ |
| posts | 3,823 | 3,823 | ✅ |
| comments | 12,824 | 12,824 | ✅ |
| replies | 8,649 | 8,649 | ✅ |
| likes | 116 | 116 | ✅ |
| reactions | 2,278 | 2,206 | ✅ (72 dupes removed) |
| blocks | 1 | 1 | ✅ |
| notifications | - | - | ⏭️ Skipped |

#### Step 4: Post-Migration SQL (Manual) ⬜

Run in **Supabase SQL Editor**:
```sql
-- Update comment reply counts (weren't exported from Firestore)
UPDATE comments c
SET count_of_replies = COALESCE(r.actual_count, 0)
FROM (
  SELECT comment_id, COUNT(*) as actual_count
  FROM replies
  GROUP BY comment_id
) r
WHERE c.id = r.comment_id;
```

---

## Key Decisions Made

### 1. Notifications: Skip Backfill, Use Dual-Write
**Context**: 14,000 of 23,497 notifications failed due to:
- Duplicate idempotency keys
- Invalid notification type check constraint

**Decision**: Don't migrate old notifications
- Notifications are time-sensitive (only relevant within ~7 days)
- Backfilled notifications would be stale anyway
- Phase 2 dual-write will capture new notifications
- Simpler than debugging constraint issues for data we don't need

### 2. Reactions: De-duplicate and Accept Data Loss
**Context**: 72 reactions were duplicates (same user, same comment, different IDs)

**Decision**: Keep first occurrence, discard duplicates
- Firestore's lack of unique constraints allowed invalid state
- Postgres correctly enforces one reaction per user per comment
- 72 lost reactions (3%) is acceptable data loss
- Better than loosening constraints

### 3. ESM Compatibility: Update Scripts
**Context**: Project uses `"type": "module"` but migration scripts used CommonJS patterns

**Decision**: Update `config.ts` for ESM compatibility
- Use `fileURLToPath(import.meta.url)` for `__dirname`
- Use `createRequire(import.meta.url)` for dynamic requires
- Allows running with `npx tsx` instead of `ts-node`

### 4. Count Verification: Use JSON Files
**Context**: Direct Firestore counting caused OOM (exit 137)

**Decision**: Count from exported JSON files
- Firestore nested queries are expensive (O(n³))
- JSON files already have accurate snapshot
- Supabase counts via API are efficient
- Avoids re-querying Firestore

---

## Files Modified

```
scripts/migration/
├── config.ts                    # ESM compatibility fix
├── export-firestore.ts          # Export Firestore → JSON (unchanged)
├── import-to-postgres.ts        # Import JSON → Supabase (unchanged)
└── reconcile/
    └── counts.ts                # Compare counts (has OOM issue, use JSON instead)

data/migration-export/           # Exported JSON files (gitignored)
├── boards.json
├── board_waiting_users.json
├── users.json
├── posts.json
├── comments.json
├── replies.json
├── likes.json
├── reactions.json
├── blocks.json
└── notifications.json
```

---

### Phase 2: Dual-Write ✅

**Deployed**: 2026-01-17

Dual-write implemented for all write operations. All Firestore writes now sync to Supabase.

**Key commits:**
- `d84c58a` - Phase 2 Dual-Write 구현: Firestore 쓰기 작업을 Supabase에 동기화
- `8d2a8eb` - PR 리뷰 피드백 반영

**Implementation:**
- `src/shared/api/dualWrite.ts` - Client-side dual-write utility
- `src/shared/api/supabaseClient.ts` - Browser Supabase client with anon key
- `functions/src/shared/supabaseAdmin.ts` - Server-side admin client
- Feature flag: `VITE_DUAL_WRITE_ENABLED`

**Entities with dual-write:**
- Users, Posts, Comments, Replies, Likes, Reactions, Blocks

---

### Phase 5: Shadow Reads ✅

**Implemented**: 2026-01-25

Shadow reads allow comparing Firestore and Supabase query results during migration.

**Key files created/modified:**

| File | Purpose |
|------|---------|
| `src/shared/api/supabaseReads.ts` | Supabase query functions for posts, comments, replies |
| `src/shared/api/shadowReads.ts` | Comparison utility, logs mismatches to console + Sentry |
| `src/shared/api/supabaseClient.ts` | Added `getReadSource()` feature flag |
| `src/user/api/commenting.ts` | Read source switching for commentings/replyings |
| `src/stats/api/stats.ts` | Read source switching for postings |
| `src/user/hooks/useUserPosts.ts` | Read source switching for user posts |

**Feature flag:** `VITE_READ_SOURCE`
- `firestore` (default): Read from Firestore only
- `supabase`: Read from Supabase only
- `shadow`: Read from both, compare, return Firestore result

**Verification status:**

| Query Type | Shadow Tested | Mismatches |
|------------|---------------|------------|
| postings | ✅ | None observed |
| postingsForContributions | ✅ | None observed |
| commentings | ✅ | None observed |
| replyings | ✅ | None observed |
| userPosts | ✅ | None observed |

**Issue fixed during implementation:**
- `replies.post_id` had no FK constraint to `posts`, causing PostgREST to reject the join
- Fixed by running: `ALTER TABLE replies ADD CONSTRAINT replies_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id);`

---

### Phase 5.1: Shadow Read Mismatch Fix ✅

**Implemented**: 2026-02-10

Shadow reads detected **60+ unresolved Sentry issues** (62 at final count) — data in Firestore fan-out collections missing from Supabase tables.

**Root causes identified:**
1. **Primary**: `VITE_DUAL_WRITE_ENABLED` was missing from CI until Feb 8 (commit `93437eb5`). Dual write never ran in production for ~3 weeks (Jan 16 → Feb 8).
2. **Secondary**: All dual write lambdas silently swallowed Supabase errors. The Supabase JS v2 client returns `{ data, error }` without throwing, but no call site checked `error`. The `dualWrite()` try/catch never fired → 0 errors in Sentry → false confidence.

**Fixes applied:**

| Change | Files | Description |
|--------|-------|-------------|
| `SupabaseDualWriteError` class | `dualWrite.ts`, `supabaseAdmin.ts` | Custom error wrapping `PostgrestError` with full context |
| `throwOnError()` helper | `dualWrite.ts`, `supabaseAdmin.ts` | Checks `{ error }` from every Supabase response and throws |
| Client call sites wrapped | 10 files, 24 call sites | All `supabase.from().insert/update/delete/upsert()` wrapped |
| Server call sites wrapped | 4 notification files, 5 call sites | Same pattern for Cloud Functions |
| Dead-letter queue | `dualWrite.ts`, `supabaseAdmin.ts` | Failed writes persisted to `_supabase_write_failures` Firestore collection |
| Idempotent server writes | 4 notification files | `.insert()` → `.upsert({ onConflict: 'id' })` to prevent duplicate notifications on Cloud Function retries |

**Key commits:**
- `95b94a9` - Supabase dual-write 에러 감지 및 실패 기록 인프라 추가
- `5405b69` - 클라이언트 dual-write 24개 호출에 throwOnError 적용
- `4937ce7` - 서버 측 dual-write 에러 감지 및 실패 기록 인프라 추가
- `0a5eeec` - 알림 Cloud Functions에 throwOnError 적용 및 upsert로 변경

**Backfill**: Running `scripts/migration/backfill-gap.ts` (covers Jan 16 → Feb 8 gap) to sync missing data. Uses `upsert` with `ignoreDuplicates: true` — safe against overwriting records already synced by dual write.

**Dead-letter verification**: After deployment, query `_supabase_write_failures` collection. Should be empty if dual write is healthy.

---

### Phase 5.2: boardPermissions Dual-Write Fix ✅

**Implemented**: 2026-02-16

Phase 6 was blocked because **all users got 403** when `VITE_READ_SOURCE=supabase`.

**Symptom**: Board loader calls `fetchUser(uid)` → Supabase returns user with empty `boardPermissions` → loader throws 403.

**Root causes identified:**
1. **Main app dual-write gap**: In Firestore, `boardPermissions` is a map field on `users/{uid}`. In Supabase, permissions are normalized into `user_board_permissions(user_id, board_id, permission)`. `createUser()` and `updateUser()` dual-write to `users` table but never wrote to `user_board_permissions`.
2. **Admin app bypass**: The admin app (`admin-daily-writing-friends/`) writes directly to Firestore via client SDK (e.g., `updateDoc(userRef, { ['boardPermissions.${boardId}']: 'write' })`), bypassing main app code entirely. This was the primary source of the 24 missing permissions.

**Verification** (`scripts/debug/verify-board-permissions.ts`):
| Metric | Before Fix | After Fix |
|--------|-----------|-----------|
| Matching permissions | 492 | 516 |
| Missing in Supabase | 24 | 0 |
| Mismatched values | 0 | 0 |

All 24 missing permissions were for board `MCyYUxiXsY5HBzcjbkBR` (cohort 22), granted after the initial backfill.

**Fixes applied:**

| Change | Files |
|--------|-------|
| Dual-write `boardPermissions` in `createUser()` | `src/user/api/user.ts` |
| Dual-write `boardPermissions` in `updateUser()` | `src/user/api/user.ts` |
| `useWritePermission` respects `getReadSource()` | `src/shared/hooks/useWritePermission.ts` |
| Backfill 24 missing permissions | `scripts/migration/backfill-board-permissions.ts` |

---

### Phase 5.3: Admin App Dual-Write ✅

**Implemented**: 2026-02-16

The admin app (`~/coding/tutorial/admin-daily-writing-friends/`) is a separate Next.js 15 app (React 18, Firebase client SDK + Admin SDK, Tailwind/shadcn) with zero Supabase integration. Added dual-write for the 4 critical operations out of 11 total Firestore writes.

**Admin app Firestore write operations (11 total):**

| # | Operation | Collection | Migration Impact |
|---|-----------|-----------|-----------------|
| 1 | **Approve user** (grant boardPermissions) | `users/{uid}` | **CRITICAL** — dual-write to `user_board_permissions` |
| 2 | **Approve user** (remove from waitingUsersIds) | `boards/{boardId}` | **HIGH** — dual-write to `board_waiting_users` |
| 3 | **Reject user** (remove from waitingUsersIds) | `boards/{boardId}` | **HIGH** — dual-write to `board_waiting_users` |
| 4 | **Create board** (new cohort) | `boards` | **HIGH** — dual-write to `boards` table |
| 5-11 | Holidays, narrations (7 operations) | `holidays/`, `narrations/` | LOW — not in Supabase schema |

**Files modified in admin app (separate repo):**

| File | Change |
|------|--------|
| `src/lib/supabase.ts` | New: Supabase client + `adminDualWrite()` helper |
| `src/app/admin/user-approval/page.tsx` | Dual-write for approve (upsert `user_board_permissions`, delete `board_waiting_users`) and reject (delete `board_waiting_users`) |
| `src/hooks/useCreateUpcomingBoard.ts` | Dual-write for board creation (insert `boards`) |

Operations 5-11 (holidays, narrations) are admin-only data not in Supabase schema — no dual-write needed.

**Env vars needed in admin app `.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=https://mbnuuctaptbxytiiwxet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<key>
```

> Admin app changes are in the separate `admin-daily-writing-friends` repository (not this PR).

---

### Phase 5.4: engagement_score Dual-Write Fix ✅

**Implemented**: 2026-02-20

BestPostCardList showed same posts as RecentPostCardList when `VITE_READ_SOURCE=supabase`.

**Root cause**: The `updateEngagementScore` Cloud Function recalculates `engagementScore = comments + replies + likes` on every post change, but only wrote to Firestore — never to Supabase. All `posts.engagement_score` values in Supabase were stuck at the default `0`, so `ORDER BY engagement_score DESC` returned arbitrary order.

**Fixes applied:**

| Change | Files |
|--------|-------|
| Add `dualWriteServer` to `updateEngagementScore` | `functions/src/engagementScore/updateEngagementScore.ts` |
| Backfill script for existing scores | `scripts/migration/backfill-engagement-scores.ts` |

**Backfill results:**
| Metric | Count |
|--------|-------|
| Total posts | 4,155 |
| Posts with engagement > 0 | 566 |
| Updated in Supabase | 566 |
| Errors | 0 |
| Verified in Supabase (engagement_score > 0) | 564 |

2 posts had non-zero Firestore scores but don't exist in Supabase (likely deleted after backfill window).

---

## Phase 6: Switch Reads to Supabase (In Progress)

**Completed**: 2026-02-16

1. ✅ Verify backfill completed successfully
2. ✅ Run shadow mode (`VITE_READ_SOURCE=shadow`) — ran Jan 25 → Feb 10
3. ✅ Monitor Sentry for mismatch warnings — 62 issues analyzed, all false positives
   - Root cause: orphaned fan-out entries referencing deleted comments/replies
   - Supabase SQL queries produce more accurate results than stale fan-out data
4. ✅ `VITE_READ_SOURCE` GitHub secret updated to `supabase` (2026-02-10)
5. ✅ Fix boardPermissions dual-write gap (Phase 5.2, 2026-02-16)
   - Main app: `createUser()`, `updateUser()` now sync to `user_board_permissions`
   - Admin app: 4 dual-write operations added
   - Backfill: 516/516 permissions match (0 missing, 0 mismatched)
6. ✅ Fix engagement_score dual-write gap (Phase 5.4, 2026-02-20)
   - `updateEngagementScore` Cloud Function now dual-writes to Supabase
   - Backfill: 566 posts synced (0 errors), 564 confirmed in Supabase
   - BestPostCardList verified working in production
7. ⬜ Deploy admin app with Supabase env vars
8. ⬜ Deploy main app to production (merge to main triggers CI)
9. ⬜ Monitor for issues, keep rollback ready (`VITE_READ_SOURCE=firestore`)

### Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Admin app dual-write fails silently | Medium | Log errors + Sentry; can re-backfill anytime |
| New cohort created only in Firestore | Medium | Phase 5.3 adds dual-write for board creation |
| RLS blocks reads in future | Low | Verified: anon key can read all tables |
| Supabase project paused (free tier) | Low | Resume in dashboard; set up health check |

---

### Phase 3: Remove Fan-out Functions ✅

**Completed**: 2026-02-21
**Branch**: `migration-remove-fan-out` (PR #459)

**What was done:**

1. **Fixed N+1 user fetch on board page** — PostCard called `useUser()` per post to get profile photo. Added PostgREST join `users!author_id(profile_photo_url)` to posts query, embedded `authorProfileImageURL` in Post model. Eliminated per-card user queries.

2. **Migrated `useActivity` to Supabase** — Last Firestore fan-out reader (`src/comment/hooks/useActivity.ts`) replaced with 3 Supabase count queries using `!inner` joins on `comments`/`replies` → `posts`/`comments` tables.

3. **Deleted fan-out Cloud Functions:**
   - `functions/src/postings/` (createPosting, updatePosting, onPostingCreated)
   - `functions/src/commentings/` (createCommenting, updateCommenting)
   - `functions/src/replyings/` (createReplying, updateReplying)
   - Removed exports from `functions/src/index.ts`

4. **Cleaned up dead Firestore/shadow read code:**
   - `src/post/api/post.ts` — Supabase-only (removed Firestore + shadow paths)
   - `src/stats/api/stats.ts` — Supabase-only
   - `src/user/api/commenting.ts` — Supabase-only
   - `src/user/hooks/useUserPosts.ts` — Supabase-only
   - Deleted `src/shared/api/shadowReads.ts` (zero consumers)
   - Deleted `src/shared/utils/postingUtils.ts` (zero consumers)

**Note:** `functions/src/eventSourcing/backfill/backfillUserEventsDb.ts` still reads from `users/{uid}/postings` Firestore subcollection. This is a one-time backfill script reading existing data — the subcollection data stays in Firestore, only the Cloud Functions that WRITE to it were removed.

**Known remaining N+1:** `usePostingStreak` / `usePostProfileBadges` make per-author queries (tracked in issue #460, low priority — React Query deduplicates per userId).

---

## Next Steps

### Phase 7: Stop Dual-Write & Freeze Firestore

### Post-Migration: Admin App Switch

Once Firestore is fully deprecated (after Phase 7):
- Admin app switches from Firestore to Supabase as primary
- Remove Firestore SDK dependency from admin app
- Use Supabase service role key for all admin operations (server-side only)
- holidays/narrations tables can be added to Supabase schema if needed

---

## Environment Info

**Supabase Project:**
- **Ref**: `mbnuuctaptbxytiiwxet`
- **URL**: `https://mbnuuctaptbxytiiwxet.supabase.co`
- **Dashboard**: https://supabase.com/dashboard/project/mbnuuctaptbxytiiwxet
- **Note**: Free tier - may pause after inactivity

**Local Setup:**
```bash
# Required: Google Cloud auth for Firebase Admin
gcloud auth application-default login

# Required in .env:
SUPABASE_URL=https://mbnuuctaptbxytiiwxet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<key>
```

---

## Notes

- Firebase Auth remains unchanged (no auth migration)
- Activity fan-out Cloud Functions deleted (Phase 3). Subcollection data remains in Firestore (read-only by backfill scripts)
- Notifications remain materialized (explicit table, not computed)
- Client will use Supabase `anon` key (not service role)
