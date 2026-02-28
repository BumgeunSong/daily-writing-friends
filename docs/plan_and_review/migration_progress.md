# Firebase → Supabase Migration Progress

> **This is the single source of truth** for the Firestore → Supabase migration.
> For the original architectural plan, see [plan_firebase_supabase_migration.md](./plan_firebase_supabase_migration.md).

**Last Updated**: 2026-03-01
**Status**: Phase 8 complete — RLS 재활성화 + Firebase Auth 코드 제거 대기 (PR #497)

---

## Completed Work

### Phase 0: Supabase Schema ✅

**Schema created (13 tables):**

| Table | Description |
|-------|-------------|
| `boards` | Board metadata |
| `users` | User profiles (Firebase UID as PK → Phase 8에서 UUID로 전환) |
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
| notifications | - | - | ⏭️ Skipped (time-sensitive, used dual-write instead) |

**Key decisions:**
- **Notifications**: Skipped backfill — notifications are time-sensitive (only relevant within ~7 days). Phase 2 dual-write captured new ones.
- **Reactions**: De-duplicated 72 records (3%) — Firestore lacked unique constraints, Postgres correctly enforces one reaction per user per comment.
- **Count verification**: Used exported JSON files instead of live Firestore queries (original script OOM'd at O(n³) nested queries).

---

### Phase 2: Dual-Write ✅

**Deployed**: 2026-01-17

Dual-write implemented for all write operations. All Firestore writes sync to Supabase.

**Implementation:**
- `src/shared/api/dualWrite.ts` — Client-side dual-write utility
- `src/shared/api/supabaseClient.ts` — Browser Supabase client with anon key
- `functions/src/shared/supabaseAdmin.ts` — Server-side admin client
- Feature flag: `VITE_DUAL_WRITE_ENABLED`

**Entities with dual-write:** Users, Posts, Comments, Replies, Likes, Reactions, Blocks

---

### Phase 3: Remove Fan-out Functions ✅

**Completed**: 2026-02-21
**Branch**: `migration-remove-fan-out` (PR #459)

1. **Fixed N+1 user fetch on board page** — Added PostgREST join `users!author_id(profile_photo_url)` to posts query
2. **Migrated `useActivity` to Supabase** — Last Firestore fan-out reader replaced with Supabase count queries
3. **Deleted fan-out Cloud Functions** — `postings/`, `commentings/`, `replyings/` (6 functions removed)
4. **Cleaned up dead Firestore/shadow read code** — Supabase-only paths in `post.ts`, `stats.ts`, `commenting.ts`, `useUserPosts.ts`

**Note:** `backfillUserEventsDb.ts` still reads from `users/{uid}/postings` Firestore subcollection (one-time backfill script, read-only).

---

### Phase 5: Shadow Reads ✅

**Implemented**: 2026-01-25

Shadow reads compared Firestore and Supabase query results during migration.

**Feature flag:** `VITE_READ_SOURCE` — `firestore` (default) | `supabase` | `shadow`

**All 5 query types verified with zero mismatches:** postings, postingsForContributions, commentings, replyings, userPosts

---

### Phase 5.1: Shadow Read Mismatch Fix ✅

**Implemented**: 2026-02-10

Shadow reads detected **62 Sentry issues** — data in Firestore fan-out collections missing from Supabase.

**Root causes:**
1. `VITE_DUAL_WRITE_ENABLED` missing from CI for ~3 weeks (Jan 16 → Feb 8)
2. All dual-write lambdas silently swallowed Supabase errors (Supabase JS returns `{ data, error }` without throwing)

**Fixes:** `SupabaseDualWriteError` class, `throwOnError()` helper on all 29 call sites, dead-letter queue to `_supabase_write_failures` Firestore collection, idempotent server writes via `.upsert()`.

---

### Phase 5.2: boardPermissions Dual-Write Fix ✅

**Implemented**: 2026-02-16

Phase 6 was blocked — all users got 403 when `VITE_READ_SOURCE=supabase` because `user_board_permissions` was never dual-written.

**Fixes:** Dual-write `boardPermissions` in `createUser()`/`updateUser()`, backfill 24 missing permissions. Final: 516/516 match.

---

### Phase 5.3: Admin App Dual-Write ✅

**Implemented**: 2026-02-16

Added dual-write for 4 critical operations in the admin app (`admin-daily-writing-friends/`, separate repo):
- Approve user (grant boardPermissions + remove from waitingUsersIds)
- Reject user (remove from waitingUsersIds)
- Create board

Operations 5-11 (holidays, narrations) are admin-only data not in Supabase schema.

---

### Phase 5.4: engagement_score Dual-Write Fix ✅

**Implemented**: 2026-02-20

`updateEngagementScore` Cloud Function only wrote to Firestore — all Supabase `engagement_score` values were 0. Added dual-write + backfill 566 posts.

---

### Phase 6: Switch Reads to Supabase ✅

**Completed**: 2026-02-16

1. ✅ Shadow mode ran Jan 25 → Feb 10 — 62 Sentry issues analyzed, all false positives (orphaned fan-out entries)
2. ✅ `VITE_READ_SOURCE` updated to `supabase` (2026-02-10)
3. ✅ boardPermissions gap fixed (Phase 5.2)
4. ✅ engagement_score gap fixed (Phase 5.4)

---

### Phase 7A: Supabase 단독 쓰기 전환 ✅

**Completed**: 2026-02-22
**Branch**: `migration/phase7-remove-firestore` (PR #464, merged)

1. **Dual-write 제거** — Supabase만 쓰기 대상
2. **카운터 업데이트 DB 트리거 전환** — `updateEngagementScore` Cloud Function → Supabase SQL 트리거
3. **알림 생성 Edge Function 추가** — `create-notification` Edge Function + `pg_net` 트리거
4. **`trackedFirebase.ts` 삭제**

**⚠️ Hotfix (2026-02-22):** RLS 정책이 `auth.uid()::text`를 사용하지만 Supabase Auth 세션이 없어 모든 쓰기가 차단됨. RLS 비활성화 + 정책 삭제로 긴급 복구.

---

### Phase 7B: 잔여 Firestore 코드 제거 ✅

**Completed**: 2026-02-22
**Branch**: `migration/phase7-remove-firestore` (PR #472, merged)

1. ✅ `src/shared/utils/boardUtils.ts` 삭제 → `src/board/utils/boardUtils.ts` (Supabase 버전)으로 전환
2. ✅ `src/shared/utils/postUtils.ts` 삭제 → `src/post/utils/postUtils.ts` (Supabase 버전)으로 통합
3. ✅ `fetchPost`, `fetchAdjacentPosts` Supabase 전환

---

### Phase 8A: Firebase Auth → Supabase Auth ✅

**Completed**: 2026-02-28
**Branch**: `migration/phase8-supabase-auth` (PR #489, merged)

1. **Auth Client Migration** — `signInWithGoogle`, `signOutUser`를 Supabase Auth로 전환. `mapToAuthUser` 호환 레이어로 30+ 소비 파일 변경 없이 전환.
2. **Database Migration** (`20260228000000_remap_uids_to_uuid.sql`) — 106명 Firebase UID → Supabase UUID 매핑, 14개 테이블 FK 컬럼 TEXT → UUID 변환, `users.id` → `auth.users.id` FK 연결
3. **Migration Scripts** — `create-supabase-auth-users.ts` (106명 계정 생성), `validate-uid-migration.ts` (무결성 검증)
4. **Stability Fixes** — `parseStoredAuthUser`에 UUID 포맷 검증 (stale Firebase UID 자동 정리), OAuth redirect 에러 핸들링 강화

**Key decisions:**
- `users.id`를 Firebase UID (TEXT) → Supabase Auth UUID로 변경 (clean break)
- 106명 전원 Supabase Auth 계정 사전 생성 → Google 로그인 시 이메일 매칭으로 자동 연결
- 단일 SQL 트랜잭션으로 15개 FK 컬럼 + PK 일괄 전환
- 모든 사용자 재로그인 필요 (1회)
- `uid_mapping` 테이블 보존 (롤백용)

---

### Phase 8B: RLS 재활성화 + Firebase Auth 코드 제거 ✅

**Completed**: 2026-03-01
**Branch**: `worktree-auth-migration-finish` (PR #497)
**Resolves**: #469, #490, #491, #492

1. **RLS 정책 재활성화** (`20260301000000_reenable_rls.sql`) — 13개 테이블에 UUID-native `auth.uid()` 정책 적용
2. **Private 게시글 보호** — `visibility = 'public' OR auth.uid() = author_id` 조건 추가
3. **UPDATE 정책 강화** — `WITH CHECK` 추가하여 owner 컬럼 변조 방지
4. **Firebase Auth SDK 제거** — `src/firebase/auth.ts` 삭제, 관련 import/export 정리
5. **설정/코드 정리** — CI env vars, `.env` 파일, Sentry fingerprint, dead constants 제거
6. **LLM 테스팅 문서 업데이트** — Supabase-only 아키텍처 반영

**RLS Policy Design:**

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| posts | public (private=author only) | own | own + WITH CHECK | own |
| comments/replies | public | own | own + WITH CHECK | own |
| likes/reactions | public | own | - | own |
| notifications | own (recipient) | service_role only | own + WITH CHECK | own |
| drafts | own | own | own + WITH CHECK | own |
| blocks | own (blocker) | own | - | own |
| users | public | own (id=auth.uid) | own + WITH CHECK | - |
| reviews | public | own | own + WITH CHECK | - |
| boards | public | service_role | - | - |
| user_board_permissions | public | service_role | - | - |
| board_waiting_users | public | own | - | - |
| uid_mapping/write_ops/migration_diffs | no anon access | - | - | - |

---

## Remaining Issues

### Production Deployment (Phase 8B)
- [ ] Deploy client code (PR #497 merge → Firebase Hosting)
- [ ] Apply RLS migration: `supabase db push`
- [ ] Verify Google OAuth login
- [ ] Verify post creation/editing (tests INSERT/UPDATE policies)
- [ ] Verify private posts hidden from other users
- [ ] Verify notifications visible only to recipient
- [ ] Run `VACUUM ANALYZE` on production (#493)

### Post-Migration
- **#466**: `firebase/firestore` import 정리 — `Timestamp` 타입 의존성 해결 (Phase 8이 `firebase/auth` 제거, firestore는 별도)
- **#471**: Sentry 관측성 — `throwOnError`에 Sentry breadcrumb 추가
- **#470**: Edge Function 알림 쿼리 최적화
- **#467**: Admin 앱 Supabase 전환 (별도 레포)
- **#468**: Firestore 데이터 아카이브 — Phase 8 완료 + Rollback window (2주) 경과 후

---

## Environment Info

**Supabase Project:**
- **Ref**: `mbnuuctaptbxytiiwxet`
- **URL**: `https://mbnuuctaptbxytiiwxet.supabase.co`
- **Dashboard**: https://supabase.com/dashboard/project/mbnuuctaptbxytiiwxet
- **Note**: Free tier — may pause after inactivity

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

- Auth fully migrated to Supabase Auth (Phase 8). Client uses `anon` key with auth session, RLS enforced via `auth.uid()`.
- Activity fan-out Cloud Functions deleted (Phase 3). Subcollection data remains in Firestore (read-only by backfill scripts).
- Notifications remain materialized (explicit table, not computed).
- Firebase Storage는 아직 Firebase에 의존 (별도 마이그레이션 필요).
- **`Timestamp.fromDate()` 변환 누락 주의**: 대부분의 엔티티는 Supabase API 레이어에서 ISO 문자열을 `Timestamp.fromDate()`로 변환하여 기존 `.toDate()` 호출이 동작함. 그러나 `Draft`는 이 변환 레이어 없이 직접 문자열을 반환하여 `.toDate()` 런타임 에러 발생 (`fix/savedAt-toDate-error`에서 수정). 새 Supabase 쓰기 함수 추가 시 `Timestamp` 변환 여부를 확인할 것.
