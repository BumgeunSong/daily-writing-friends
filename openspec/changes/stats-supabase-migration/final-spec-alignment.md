# Final Spec Alignment: stats-supabase-migration

**Date**: 2026-03-02
**Branch**: worktree-long-running-harness
**PR**: https://github.com/BumgeunSong/daily-writing-friends/pull/502
**CI**: All checks passing (562/562 tests, SonarCloud Quality Gate passed, 100% coverage on new code)

---

## Drift Analysis

Commits after `spec-alignment.md` was created (commit `65452cc6`):

| Commit | Files Changed | Source Code Impact |
|--------|--------------|-------------------|
| `094f3d19` | `scripts/long-running-harness/run.sh` | None |
| `f185b55a` | `openspec/changes/stats-supabase-migration/pull-request.md` | None |

**No source files changed after spec-alignment.** No spec updates required.

---

## Final Alignment Table

### spec: stats-supabase-direct-reads

| Requirement | Scenario | Status | Evidence |
|---|---|---|---|
| Native Date in Activity Models — Posting | `Posting.createdAt` is native `Date`, no Timestamp | **Aligned** | `src/post/model/Posting.ts`: `createdAt: Date`, no Firebase import |
| Native Date in Activity Models — Commenting | `Commenting.createdAt` is native `Date` | **Aligned** | `src/user/model/Commenting.ts`: `createdAt: Date` |
| Native Date in Activity Models — Replying | `Replying.createdAt` is native `Date` | **Aligned** | `src/user/model/Replying.ts`: `createdAt: Date` |
| Stats API Returns Supabase Data Directly — fetchPostingData | Returns `fetchPostingsFromSupabase` directly | **Aligned** | `src/stats/api/stats.ts` line 19: direct return, no mapping |
| Stats API Returns Supabase Data Directly — fetchPostingDataForContributions | Returns `fetchPostingsByDateRangeFromSupabase` directly | **Aligned** | `src/stats/api/stats.ts` line 58: direct return |
| Commenting API Returns Supabase Data Directly — fetchUserCommentingsByDateRange | Returns `fetchCommentingsByDateRangeFromSupabase` directly | **Aligned** | `src/user/api/commenting.ts` line 14: direct return |
| Commenting API Returns Supabase Data Directly — fetchUserReplyingsByDateRange | Returns `fetchReplyingsByDateRangeFromSupabase` directly | **Aligned** | `src/user/api/commenting.ts` line 23: direct return |
| No Firebase Timestamp Import — stats.ts | No `Timestamp` import from `firebase/firestore` | **Aligned** | Confirmed: no Firebase import in `stats.ts` |
| No Firebase Timestamp Import — commenting.ts | No `Timestamp` import from `firebase/firestore` | **Aligned** | Confirmed: no Firebase import in `commenting.ts` |
| Call Sites Use createdAt Directly — writingStatsUtils | `getDateKey(posting.createdAt)` with no `.toDate()` | **Aligned** | `src/stats/utils/writingStatsUtils.ts` line 12 |
| Call Sites Use createdAt Directly — commentingContributionUtils | `getDateKey(c.createdAt)` and `getDateKey(r.createdAt)` with no `.toDate()` | **Aligned** | `src/stats/utils/commentingContributionUtils.ts` lines 20, 24 |
| Call Sites Use createdAt Directly — usePostingStreak | `getDateKey(p.createdAt)` with no `.toDate()` | **Aligned** | `src/stats/hooks/usePostingStreak.ts` line 23 |
| Stats Utils Correct Output — KST same-day grouping | Two records on same KST day grouped together | **Aligned** | Test T.3 added to `writingStatsUtils.test.ts`, passing |
| Stats Utils Correct Output — KST cross-day grouping | Records on different KST days grouped separately | **Aligned** | Covered by test suite (562/562 passing) |
| Stats Utils Correct Output — Empty input | Empty arrays produce empty output without error | **Aligned** | Covered by existing tests (T.4) |

### spec: holidays-supabase-read

| Requirement | Scenario | Status | Notes |
|---|---|---|---|
| Holiday Data Read from Supabase — fetchHolidaysForRange uses Supabase | Queries Supabase holidays table | **Missing** | Gate not confirmed; intentional deferral |
| Holiday Data Read from Supabase — fetchHolidays delegates to Supabase | fetchHolidays uses Supabase-backed implementation | **Missing** | Gate not confirmed; intentional deferral |
| Year-Boundary Query — includes start year from Jan 1 | Query starts at Jan 1 of start year | **Missing** | Not implemented; deferred |
| Year-Boundary Query — includes end year through Dec 31 | Query ends at Dec 31 of end year | **Missing** | Not implemented; deferred |
| Year-Boundary Query — spans multiple years | Both years covered | **Missing** | Not implemented; deferred |
| Error Handling Returns Empty Array — Supabase error | Returns `[]`, logs error | **Missing** | Not implemented; deferred |
| Error Handling Returns Empty Array — Missing table | Returns `[]` without throwing | **Missing** | Not implemented; deferred |
| Return Type Contract Preserved — valid rows | Returns `Holiday[]` with `date` and `name` | **Aligned** | `fetchHolidaysForRange` already typed as `Promise<Holiday[]>` |
| Return Type Contract Preserved — empty range | Returns `[]` without error | **Aligned** | Function signature unchanged |
| Supabase holidays Table Precondition — anon SELECT | Unauthenticated SELECT succeeds | **Missing** | Gate not confirmed |
| Supabase holidays Table Precondition — writes restricted | Anon writes rejected by RLS | **Missing** | Gate not confirmed |
| Legacy Firestore Helpers Removed — no Firestore imports | No `firebase/firestore` or `@/firebase` imports | **Missing** | Still present; deferred |
| Legacy Firestore Helpers Removed — fetchHolidaysForYear deleted | Function no longer exported | **Missing** | Still present; deferred |

---

## Summary

| Spec | Total Requirements | Aligned | Missing | Drifted |
|---|---|---|---|---|
| stats-supabase-direct-reads | 15 | **15** | 0 | 0 |
| holidays-supabase-read | 13 | 2 | **11** | 0 |
| **Total** | **28** | **17** | **11** | **0** |

---

## Deferred Requirements (holidays-supabase-read)

All 11 missing requirements are **intentionally deferred** pending the gate condition in `tasks.md` Group 3:

> **Gate**: Only implement this group after confirming: (1) `holidays` table exists in Supabase with complete data for all Firestore years, and (2) RLS policy allows unauthenticated (`anon` role) SELECT access.

This gate has not been confirmed. `holidays.ts` still uses Firestore; no action needed for this PR. When the gate is met, create a follow-up PR implementing tasks 3.1–3.5.

---

## Conclusion

The `stats-supabase-direct-reads` spec is **fully aligned** with the implementation. No spec updates were needed. No PR review feedback or CI fixes caused any behavioral drift — the only post-alignment commits touched harness scripts and openspec artifacts.

The `holidays-supabase-read` spec requirements remain correctly **Missing** as tracked in `spec-alignment.md`. This is expected and does not block merge.

**This PR is spec-complete for the work it sets out to do.**
