# Firebase → Supabase Migration Progress

**Last Updated**: 2026-01-06
**Branch**: `supabase-migration`
**Status**: Phase 0 complete, Phase 1 ready to execute

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

**Files created:**
```
supabase/
├── config.toml
└── migrations/
    ├── 20260106000000_initial_schema.sql      # Core tables with Historical Identity
    ├── 20260106000001_normalize_schema.sql    # waiting_users_ids → join table
    └── 20260106000002_reactions_proper_fks.sql # Proper FK constraints for reactions

scripts/migration/
├── config.ts                    # Firebase Admin + Supabase clients
├── export-firestore.ts          # Export Firestore → JSON
├── import-to-postgres.ts        # Import JSON → Supabase
├── reconcile/
│   └── counts.ts                # Compare row counts
└── sql/
    └── integrity_checks.sql     # SQL validation queries
```

---

## Next Steps

### Phase 1: Backfill Firestore → Supabase

**Prerequisites:**
1. ✅ `SUPABASE_SERVICE_ROLE_KEY` added to `.env`
2. ⬜ Firebase Admin credentials (run `gcloud auth application-default login`)

**Commands to run:**
```bash
# Step 1: Export Firestore data to JSON
npx ts-node scripts/migration/export-firestore.ts

# Step 2: Import to Supabase
npx ts-node scripts/migration/import-to-postgres.ts

# Step 3: Verify counts match
npx ts-node scripts/migration/reconcile/counts.ts

# Step 4: Run SQL integrity checks
# (via Supabase SQL Editor or psql)
```

**Expected output files:**
```
data/migration-export/
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

### Phase 2-7: See Full Plan

Reference: `docs/plan_and_review/plan_firebase_supabase_migration.md`

- Phase 2: Introduce Dual-Write
- Phase 3: Replace Firebase Relationship Functions
- Phase 4: Migrate Notifications
- Phase 5: Shadow Reads
- Phase 6: Switch Reads Gradually
- Phase 7: Stop Dual-Write & Freeze Firestore

---

## Environment Setup for Next Session

```bash
# 1. Switch to migration branch
git checkout supabase-migration

# 2. Install dependencies (if needed)
npm install

# 3. Authenticate with Google Cloud (for Firebase Admin)
gcloud auth application-default login

# 4. Verify .env has Supabase credentials
grep SUPABASE .env

# 5. Resume with Phase 1 backfill
npx ts-node scripts/migration/export-firestore.ts
```

---

## Supabase Project Info

- **Project Ref**: `mbnuuctaptbxytiiwxet`
- **URL**: `https://mbnuuctaptbxytiiwxet.supabase.co`
- **Region**: (check Supabase dashboard)
- **Dashboard**: https://supabase.com/dashboard/project/mbnuuctaptbxytiiwxet

---

## Notes

- Firebase Auth remains unchanged (no auth migration)
- Activity fan-out collections (`postings`, `commentings`, `replyings`) will be deleted and replaced with SQL queries
- Notifications remain materialized (explicit table)
- Client will use Supabase `anon` key (not service role)
