# Verification Report: stats-supabase-migration

**Date**: 2026-03-02
**Branch**: worktree-long-running-harness

---

## Summary

| Layer | Total | Passed | Failed | Status |
|-------|-------|--------|--------|--------|
| Layer 1 — Unit | 562 | 562 | 0 | PASS |
| Layer 2 — Integration | 562 | 562 | 0 | PASS |
| Layer 3 — E2E Network Passthrough | — | — | — | SKIPPED (no agent-browser in harness) |
| Layer 4 — E2E Local DB | — | — | — | SKIPPED (holidays migration not implemented) |

**Overall Verdict: PASS** (for layers 1 and 2; layers 3 and 4 skipped per scope)

---

## Layer 1 — Unit (Vitest)

**Status: PASS**
**Tests run**: 562 | **Passed**: 562 | **Failed**: 0

### Initial State (pre-fix)

The test suite had 13 failures at session start:

- `writingStatsUtils.test.ts`: 5 failures — `accumulatePostingLengths` returned `undefined` for date keys because `posting.createdAt` was a Firebase `Timestamp` object but `getDateKey()` expected a native `Date`.
- `commentingContributionUtils.test.ts`: 6 failures — same root cause; `Commenting.createdAt` and `Replying.createdAt` were still `Timestamp` types, but the implementation (after task 1.x) passed them directly to `getDateKey()`.
- `commentingStatsUtils.test.ts`: 2 failures (`createUserCommentingStats`) — `Invalid time value` because inner test fixtures used `MockTimestamp.fromDate(date)` for `createdAt`, which is not a `Date`.

**Root cause**: Implementation tasks 1.1–1.4 removed `.toDate()` call sites in the business logic (correct), but tasks 2.1–2.10 (model type changes, wrapper removal, test fixture updates) had not been executed. The models still declared `createdAt: Timestamp`, and test fixtures still constructed with `Timestamp.fromDate(date)`.

### Fix Applied

| Task | Change | File |
|------|--------|------|
| 2.1 | `createdAt: Timestamp` → `createdAt: Date`, removed Firestore import | `src/post/model/Posting.ts` |
| 2.2 | `createdAt: Timestamp` → `createdAt: Date`, removed Firestore import | `src/user/model/Commenting.ts` |
| 2.3 | `createdAt: Timestamp` → `createdAt: Date`, removed Firestore import | `src/user/model/Replying.ts` |
| 2.5 | Deleted `toPosting`, removed `Timestamp`/`SupabasePosting` imports, direct pass-through | `src/stats/api/stats.ts` |
| 2.6 | Deleted `toCommenting`/`toReplying`, removed `Timestamp` import, direct pass-throughs | `src/user/api/commenting.ts` |
| 2.7 | Removed Firestore import, `Timestamp.fromDate(date)` → `date` in fixture | `src/stats/utils/test/writingStatsUtils.test.ts` |
| 2.8 | Removed Firestore import, `Timestamp.fromDate(date)` → `date` in fixtures | `src/stats/utils/commentingContributionUtils.test.ts` |
| — | `MockTimestamp.fromDate(date)` → `date` in inner test fixtures | `src/stats/utils/test/commentingStatsUtils.test.ts` |

Type-check (`npm run type-check`) passes with zero errors after all changes.

### New Tests Added

**T.3 — KST-boundary same-day grouping** (added to `writingStatsUtils.test.ts`):
- `2024-01-01T14:59:59Z` = `2024-01-01 23:59:59 KST` → grouped into `2024-01-01`
- `2024-01-01T15:00:00Z` = `2024-01-02 00:00:00 KST` → grouped into `2024-01-02`
- Verifies `getDateKey()` correctly uses KST (Asia/Seoul) for date bucket assignment
- **Status: PASS**

**T.4 — Empty-input tests**: Already covered by existing tests:
- `accumulatePostingLengths([])` → empty map ✓ (existing test)
- `createContributions([], ...)` → all null contentLength ✓ (existing test)
- `aggregateCommentingContributions([], [], ...)` → empty array ✓ (existing test)

---

## Layer 2 — Integration (Vitest)

**Status: PASS**

Per design.md Testability Notes: "No new integration tests required for the wrapper removal." After wrapper removal, `fetchPostingData`, `fetchPostingDataForContributions`, `fetchUserCommentingsByDateRange`, and `fetchUserReplyingsByDateRange` are direct pass-throughs to Supabase functions. Type correctness is verified by `npm run type-check`. Logic correctness is covered by Layer 1 unit tests.

Full test suite (`npm run test:run`) — 562/562 passing — serves as confirmation (T.5).

---

## Layer 3 — E2E Network Passthrough (agent-browser)

**Status: SKIPPED**

The harness overrides specify no `dev3000` and no agent-browser availability in this session. Layers 3 and 4 require the dev server and browser automation tooling.

**Tests not executed:**
- T.6: Stats page contribution grid renders with correct dates and no console errors
- T.7: Writing streak count is non-zero for active users

These tests should be run manually or in a subsequent session with the full dev environment.

---

## Layer 4 — E2E Local DB (Supabase local Docker)

**Status: SKIPPED (conditional gate not met)**

Per design.md: Group 3 (holidays migration) is conditional on confirming the Supabase `holidays` table exists with complete data and RLS policy allows unauthenticated SELECT. This precondition has not been confirmed.

**Tests not executed (T.8–T.11):** All conditional on holidays migration shipping. Skip until `holidays` table precondition is confirmed.

---

## Implementation Task Status

| Task | Status | Notes |
|------|--------|-------|
| 1.1–1.4 (fix call sites) | ✓ Done | Completed before this session |
| 2.1–2.3 (model type changes) | ✓ Done | Completed this session |
| 2.4 (type-check after model change) | ✓ Done | Zero errors |
| 2.5–2.6 (remove wrappers) | ✓ Done | Completed this session |
| 2.7–2.8 (update test fixtures) | ✓ Done | Completed this session |
| 2.9 (type-check after fixtures) | ✓ Done | Zero errors |
| 2.10 (run tests) | ✓ Done | 562/562 pass |
| 3.1–3.5 (holidays migration) | ⏳ Deferred | Conditional gate not confirmed |

---

## Spec Requirements Coverage

Specs are located under `openspec/changes/stats-supabase-migration/specs/`. Coverage assessed against those specs plus design.md and tasks.md.

| Requirement | Test | Status |
|-------------|------|--------|
| `accumulatePostingLengths` works with native `Date` fixtures | T.1 (writingStatsUtils) | COVERED |
| `createContributions` works with native `Date` fixtures | T.1 (writingStatsUtils) | COVERED |
| `aggregateCommentingContributions` works with native `Date` fixtures | T.2 (commentingContributionUtils) | COVERED |
| KST-boundary grouping (2024-01-01T14:59:59Z vs T15:00:00Z) | T.3 (writingStatsUtils) | COVERED |
| Empty-input edge cases | T.4 (multiple existing tests) | COVERED |
| Integration pass-through correctness | T.5 (full test suite) | COVERED |
| Stats page UI renders correct contribution grid | T.6 (agent-browser) | NOT COVERED (skipped) |
| Writing streak display | T.7 (agent-browser) | NOT COVERED (skipped) |
| Holidays Supabase query (single year) | T.8 (Supabase local) | NOT COVERED (deferred) |
| Holidays Supabase query (multi-year range) | T.9 (Supabase local) | NOT COVERED (deferred) |
| Holidays error fallback | T.10 (Supabase local) | NOT COVERED (deferred) |
| Holidays RLS policy | T.11 (Supabase local) | NOT COVERED (deferred) |

**Unverified spec requirements**: T.6, T.7 (E2E browser — no tooling), T.8–T.11 (holidays migration — conditional, deferred).
