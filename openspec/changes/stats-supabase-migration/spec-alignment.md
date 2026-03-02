# Spec Alignment Report: stats-supabase-migration

**Date**: 2026-03-02
**Branch**: worktree-long-running-harness
**Changed files**: 35 (26 source files, 9 openspec artifacts)

---

## Summary Table

| Requirement | Spec | Status | Notes |
|---|---|---|---|
| Posting.createdAt is native Date | stats-supabase-direct-reads | **Aligned** | `Posting.ts` declares `createdAt: Date`, no Timestamp import |
| Commenting.createdAt is native Date | stats-supabase-direct-reads | **Aligned** | `Commenting.ts` declares `createdAt: Date`, no Timestamp import |
| Replying.createdAt is native Date | stats-supabase-direct-reads | **Aligned** | `Replying.ts` declares `createdAt: Date`, no Timestamp import |
| fetchPostingData returns Supabase data directly | stats-supabase-direct-reads | **Aligned** | Returns `fetchPostingsFromSupabase(userId)` with no mapping step; no `toPosting` function |
| fetchPostingDataForContributions returns Supabase data directly | stats-supabase-direct-reads | **Aligned** | Returns `fetchPostingsByDateRangeFromSupabase(...)` directly |
| fetchUserCommentingsByDateRange returns Supabase data directly | stats-supabase-direct-reads | **Aligned** | Returns `fetchCommentingsByDateRangeFromSupabase(...)` directly; no `toCommenting` |
| fetchUserReplyingsByDateRange returns Supabase data directly | stats-supabase-direct-reads | **Aligned** | Returns `fetchReplyingsByDateRangeFromSupabase(...)` directly; no `toReplying` |
| No Timestamp import in stats.ts | stats-supabase-direct-reads | **Aligned** | No `firebase/firestore` import in `stats.ts` |
| No Timestamp import in commenting.ts | stats-supabase-direct-reads | **Aligned** | No `firebase/firestore` import in `commenting.ts` |
| writingStatsUtils uses createdAt directly | stats-supabase-direct-reads | **Aligned** | `getDateKey(posting.createdAt)` — no `.toDate()` call |
| commentingContributionUtils uses createdAt directly | stats-supabase-direct-reads | **Aligned** | `getDateKey(c.createdAt)` and `getDateKey(r.createdAt)` — no `.toDate()` calls |
| usePostingStreak uses createdAt directly | stats-supabase-direct-reads | **Aligned** | `getDateKey(p.createdAt)` — no `.toDate()` call |
| KST-boundary same-day grouping test | stats-supabase-direct-reads | **Aligned** | T.3 added to `writingStatsUtils.test.ts`, passing |
| Empty-input produces empty output | stats-supabase-direct-reads | **Aligned** | Covered by existing tests (T.4) |
| fetchHolidaysForRange reads from Supabase | holidays-supabase-read | **Missing** | `holidays.ts` still uses Firestore; deferred — conditional gate not confirmed |
| Year-boundary query preserves full-year coverage | holidays-supabase-read | **Missing** | Not implemented; deferred pending gate condition |
| Error handling returns empty array on failure | holidays-supabase-read | **Missing** | Not implemented; deferred pending gate condition |
| Return type contract preserved (Promise\<Holiday[]>) | holidays-supabase-read | **Aligned** | `fetchHolidaysForRange` already returns `Promise<Holiday[]>` |
| Supabase holidays table precondition confirmed | holidays-supabase-read | **Missing** | Gate not confirmed (table existence + RLS not verified) |
| Legacy Firestore helpers removed | holidays-supabase-read | **Missing** | `fetchHolidaysForYear`, `getYearsInRange`, `doc`/`getDoc` imports still present; deferred |

---

## Spec Coverage by File

### `src/post/model/Posting.ts`
- `createdAt: Date` — no Firebase `Timestamp` import → **Aligned** with "Native Date in Activity Models"

### `src/user/model/Commenting.ts`
- `createdAt: Date` — no Firebase `Timestamp` import → **Aligned**

### `src/user/model/Replying.ts`
- `createdAt: Date` — no Firebase `Timestamp` import → **Aligned**

### `src/stats/api/stats.ts`
- `fetchPostingData` → `return fetchPostingsFromSupabase(userId)` (line 19) — direct, no wrapper → **Aligned**
- `fetchPostingDataForContributions` → `return fetchPostingsByDateRangeFromSupabase(...)` (line 58) — direct → **Aligned**
- No `Timestamp` import, no `toPosting` function → **Aligned**

### `src/user/api/commenting.ts`
- `fetchUserCommentingsByDateRange` → `return fetchCommentingsByDateRangeFromSupabase(...)` (line 14) — direct → **Aligned**
- `fetchUserReplyingsByDateRange` → `return fetchReplyingsByDateRangeFromSupabase(...)` (line 23) — direct → **Aligned**
- No `Timestamp` import, no `toCommenting`/`toReplying` functions → **Aligned**

### `src/stats/utils/writingStatsUtils.ts`
- `getDateKey(posting.createdAt)` (line 12) — no `.toDate()` → **Aligned**

### `src/stats/utils/commentingContributionUtils.ts`
- `getDateKey(c.createdAt)` (line 20), `getDateKey(r.createdAt)` (line 24) — no `.toDate()` → **Aligned**

### `src/stats/hooks/usePostingStreak.ts`
- `getDateKey(p.createdAt)` (line 23) — no `.toDate()` → **Aligned**

### `src/shared/api/holidays.ts`
- Still imports `doc, getDoc` from `firebase/firestore` and `firestore` from `@/firebase` (lines 1–2)
- `fetchHolidaysForYear` and `getYearsInRange` still present
- `fetchHolidaysForRange` still delegates to Firestore
- → All `holidays-supabase-read` requirements **Missing** (intentional deferral)

---

## Deferred Requirements (holidays-supabase-read)

The `holidays-supabase-read` spec requirements are **intentionally not implemented**. Per `tasks.md` Group 3:

> **Gate**: Only implement this group after confirming: (1) `holidays` table exists in Supabase with complete data for all Firestore years, and (2) RLS policy allows unauthenticated `anon` role SELECT.

This gate has not been confirmed. The spec requirements are correctly stated as future work; no spec update is needed. When the gate condition is met, tasks 3.1–3.5 and tests T.8–T.11 should be executed.

**Missing requirements to track** (add to a future task group or confirm gate before proceeding):
- Rewrite `fetchHolidaysForRange` to use Supabase client
- Delete `fetchHolidaysForYear` and `getYearsInRange`
- Remove `doc`, `getDoc`, `firestore` imports from `holidays.ts`
- Confirm Supabase `holidays` table exists with complete data
- Confirm RLS allows unauthenticated SELECT, rejects writes

---

## Note on verify_report.md

The `verify_report.md` states: "No `specs/` directory exists for this change. Coverage assessed from design.md and tasks.md."

This is incorrect — `specs/` was committed in an earlier commit (`0f7ebdd4`) before the verify session. The underlying coverage assessment is still accurate (all requirements from the specs were covered), but the statement about missing specs is wrong. The verify report does not need to be updated as it is historical record; this alignment report supersedes it as the authoritative spec-coverage source.
