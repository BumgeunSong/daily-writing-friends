# Phase 6 Fix & Admin App Migration Plan

> **Context**: Phase 6 (Switch Reads to Supabase) was blocked because all users got 403 "permission denied" when `VITE_READ_SOURCE=supabase`. Root cause investigation revealed two gaps in the dual-write layer.

**Created**: 2026-02-16
**Branch**: `shadow-read-mismatch`
**Status**: Plan ready for implementation

---

## Root Cause Analysis

### Bug: All users get 403 when reading from Supabase

**Symptom**: Board loader calls `fetchUser(uid)` → Supabase returns user with empty `boardPermissions` → loader throws 403.

**Root Cause 1 — Main app dual-write gap**:
- In Firestore, `boardPermissions` is a map field on the `users/{uid}` document
- In Supabase, permissions are normalized into `user_board_permissions(user_id, board_id, permission)` table
- `createUser()` and `updateUser()` in `src/user/api/user.ts` dual-write to the `users` table but **never** write to `user_board_permissions`
- Result: 24 permissions missing (all for board `MCyYUxiXsY5HBzcjbkBR` / cohort 22, granted after initial backfill)

**Root Cause 2 — Admin app has zero Supabase integration**:
- The admin app (`admin-daily-writing-friends/`) is a separate Next.js app
- It writes directly to Firestore via client SDK (e.g., `updateDoc(userRef, { ['boardPermissions.${boardId}']: 'write' })`)
- It does NOT share code with the main app — changes bypass `updateUser()` entirely
- This is the primary source of the 24 missing permissions (admin approves users to cohort 22)

**Verification evidence** (from `scripts/debug/verify-board-permissions.ts`):
| Metric | Value |
|--------|-------|
| Matching permissions | 492 |
| Missing in Supabase | 24 (all board MCyYUxiXsY5HBzcjbkBR) |
| Mismatched values | 0 |
| RLS blocking? | No |

---

## Admin App Analysis

**Path**: `~/coding/tutorial/admin-daily-writing-friends/`
**Stack**: Next.js 15, React 18, Firebase client SDK + Admin SDK, Tailwind/shadcn

### Firestore Write Operations (11 total)

| # | Operation | Collection | Migration Impact |
|---|-----------|-----------|-----------------|
| 1 | **Approve user** (grant boardPermissions) | `users/{uid}` | **CRITICAL** — must dual-write to `user_board_permissions` |
| 2 | **Approve user** (remove from waitingUsersIds) | `boards/{boardId}` | **HIGH** — must dual-write to `board_waiting_users` |
| 3 | **Reject user** (remove from waitingUsersIds) | `boards/{boardId}` | **HIGH** — must dual-write to `board_waiting_users` |
| 4 | **Create board** (new cohort) | `boards` | **HIGH** — must dual-write to `boards` table |
| 5 | Save holiday year | `holidays/{year}` | LOW — not in Supabase schema |
| 6 | Delete holiday year | `holidays/{year}` | LOW — not in Supabase schema |
| 7 | Create narration | `narrations` | LOW — not in Supabase schema |
| 8 | Create narration section | `narrations/{id}/sections` | LOW — not in Supabase schema |
| 9 | Update narration section | `narrations/{id}/sections` | LOW — not in Supabase schema |
| 10 | Delete narration section | `narrations/{id}/sections` | LOW — not in Supabase schema |
| 11 | Upload section audio | `narrations/{id}/sections` | LOW — not in Supabase schema |

**Only operations 1-4 need dual-write** (they affect tables that exist in Supabase).

Operations 5-11 (holidays, narrations) are admin-only data not migrated to Supabase.

---

## Implementation Plan

### Step 1: Fix main app dual-write ✅ DONE

**Files modified**:
- `src/user/api/user.ts` — `createUser()` and `updateUser()` now sync `boardPermissions` to `user_board_permissions` via upsert
- `src/shared/hooks/useWritePermission.ts` — now respects `getReadSource()`, queries Supabase when appropriate

### Step 2: Backfill missing permissions

Run a one-time sync script to fill the 24 missing permission rows.

**Approach**: Reuse the existing `scripts/debug/verify-board-permissions.ts` pattern — read all Firestore `boardPermissions`, upsert missing rows to Supabase `user_board_permissions`.

**Script**: `scripts/migration/backfill-board-permissions.ts`

```
For each Firestore user:
  For each boardPermissions entry:
    Upsert to user_board_permissions (user_id, board_id, permission)
    Use onConflict: 'user_id,board_id' — safe for existing rows
```

**Safety**: Uses `upsert` with `ignoreDuplicates` pattern — idempotent, can run multiple times.

### Step 3: Add Supabase dual-write to admin app (4 operations)

Since the admin app is a separate codebase without shared code, the approach is:

**Option A (Recommended): Add direct Supabase calls in admin app**
- Add `@supabase/supabase-js` dependency to admin app
- Create `src/lib/supabase.ts` with service role client (admin app is trusted)
- Wrap the 4 critical write operations with Supabase dual-write

**Why Option A over monorepo**:
- Only 4 write operations need changes
- Admin app is low-traffic (used by 1-2 admins)
- Avoids monorepo migration complexity that blocked progress
- Can be done in < 1 hour
- Once Firestore is fully deprecated, admin app switches to Supabase-only

**Implementation details**:

| Operation | Admin app file | Supabase dual-write |
|-----------|---------------|-------------------|
| Approve user (boardPermissions) | `user-approval/page.tsx:214` | `supabase.from('user_board_permissions').upsert({user_id, board_id, permission: 'write'}, {onConflict: 'user_id,board_id'})` |
| Approve user (waitingUsersIds) | `user-approval/page.tsx:221` | `supabase.from('board_waiting_users').delete().match({board_id, user_id})` |
| Reject user (waitingUsersIds) | `user-approval/page.tsx:254` | `supabase.from('board_waiting_users').delete().match({board_id, user_id})` |
| Create board | `useCreateUpcomingBoard.ts:68` | `supabase.from('boards').insert({id: docRef.id, title, description, first_day, last_day, cohort})` |

**Error handling**: Log Supabase errors to console but don't block the Firestore operation (same pattern as main app's `dualWrite()`).

### Step 4: Verify and deploy

1. Run backfill script (Step 2)
2. Re-run `verify-board-permissions.ts` — expect 0 missing, 0 mismatches
3. Test with `VITE_READ_SOURCE=supabase` locally
4. Deploy main app (merge to main)
5. Deploy admin app with dual-write
6. Monitor Sentry for permission errors

### Step 5: Update migration progress document

Update `docs/plan_and_review/migration_progress.md` with:
- Phase 5.2: boardPermissions dual-write fix
- Admin app dual-write status
- Phase 6 checklist update

---

## Execution Order

```
Step 1 ✅  Fix main app dual-write (createUser, updateUser, useWritePermission)
Step 2     Backfill missing permissions (one-time script)
Step 3     Add dual-write to admin app (4 operations)
Step 4     Verify: run comparison script, expect 0 gaps
Step 5     Deploy main app with VITE_READ_SOURCE=supabase
Step 6     Deploy admin app
Step 7     Monitor for 48 hours
```

Steps 2 and 3 can run in parallel.
Step 4 depends on both 2 and 3.
Step 5 depends on 4.

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Backfill overwrites newer data | Low | `upsert` with `onConflict` preserves existing rows |
| Admin app dual-write fails silently | Medium | Log errors + Sentry; can re-backfill anytime |
| New cohort created only in Firestore | Medium | Step 3 adds dual-write for board creation |
| RLS blocks reads in future | Low | Verified: anon key can read all tables |
| Supabase project paused (free tier) | Low | Resume in dashboard; set up health check |

---

## Future: Post-Migration Admin App

Once Firestore is fully deprecated (Phase 7):
- Admin app switches from Firestore to Supabase as primary
- Remove Firestore SDK dependency
- Consider using Supabase service role key for all admin operations
- holidays/narrations tables can be added to Supabase schema if needed

---

## Files Created/Modified

```
Main app (this repo):
  src/user/api/user.ts                          ✅ Modified (dual-write for boardPermissions)
  src/shared/hooks/useWritePermission.ts         ✅ Modified (respect getReadSource)
  scripts/debug/verify-board-permissions.ts      ✅ Created (verification)
  scripts/migration/backfill-board-permissions.ts ⬜ To create (Step 2)
  docs/plan_and_review/plan_phase6_fix_and_admin_migration.md ✅ This document

Admin app (admin-daily-writing-friends/):
  src/lib/supabase.ts                            ⬜ To create (Step 3)
  src/app/admin/user-approval/page.tsx           ⬜ To modify (Step 3)
  src/hooks/useCreateUpcomingBoard.ts            ⬜ To modify (Step 3)
  package.json                                   ⬜ To modify (add @supabase/supabase-js)
```
