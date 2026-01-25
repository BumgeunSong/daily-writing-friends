# Firebase → Supabase Migration Progress

**Last Updated**: 2026-01-25
**Branch**: `main`
**Status**: Phase 5 (Shadow Reads) implemented, ready for verification

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

## Next Steps

### Phase 6: Switch Reads Gradually

1. Run shadow mode (`VITE_READ_SOURCE=shadow`) for 24-48 hours
2. Monitor Sentry for mismatch warnings
3. Fix any data inconsistencies found
4. Switch to Supabase reads (`VITE_READ_SOURCE=supabase`)
5. Monitor for issues, keep rollback ready

### Phase 3: Remove Fan-out Functions (moved to last)

After Phase 6 confirms Supabase reads work:
- Delete `functions/src/postings/`
- Delete `functions/src/commentings/`
- Delete `functions/src/replyings/`
- Remove exports from `functions/src/index.ts`

**Note:** Phase order changed from original plan. Reads must switch before fan-out removal, otherwise new data won't appear in "My Posts" etc.

### Remaining Phases
- Phase 7: Stop Dual-Write & Freeze Firestore

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
- Activity fan-out collections (`postings`, `commentings`, `replyings`) will be deleted and replaced with SQL queries
- Notifications remain materialized (explicit table, not computed)
- Client will use Supabase `anon` key (not service role)
