# Design: stats-supabase-migration

**Status**: Ready for implementation
**Based on**: proposal.md (v2, post-review)

---

## Context

### Background

The codebase is mid-migration from Firebase/Firestore to Supabase. Data reads for
stats-related activity (postings, commentings, replyings) already come from Supabase
(via `src/shared/api/supabaseReads.ts`). However, the domain models for these entities
(`Posting`, `Commenting`, `Replying`) still declare `createdAt: Timestamp` using the
Firebase `Timestamp` type. This forces conversion shims in the read layer that serve
no data transformation purpose.

### Current State

```
Supabase DB
  → supabaseReads.ts  (returns SupabasePosting/SupabaseCommenting/SupabaseReplying with createdAt: Date)
  → toPosting/toCommenting/toReplying wrappers  (convert Date → Timestamp for type compatibility)
  → Posting/Commenting/Replying models  (declare createdAt: Timestamp)
  → consumer call sites  (call .toDate() on createdAt to get back a Date)
```

The full round-trip is: `Date (Supabase) → Timestamp (model) → Date (consumer)`.
The `Timestamp` layer adds no value.

`src/shared/api/holidays.ts` is the only remaining file performing actual Firestore
reads (`doc`/`getDoc`), fetching holiday data from a year-sharded Firestore collection
(`holidays/{year}`).

### Callers Using `.toDate()` on the Target Models

| File | Field |
|------|-------|
| `src/stats/utils/writingStatsUtils.ts:12` | `Posting.createdAt.toDate()` |
| `src/stats/utils/commentingContributionUtils.ts:20,24` | `Commenting.createdAt.toDate()`, `Replying.createdAt.toDate()` |
| `src/stats/hooks/usePostingStreak.ts:23` | `Posting.createdAt.toDate()` |

These are the **only** `.toDate()` call sites on the three target models. All other
`.toDate()` calls in the codebase operate on out-of-scope types (`Post`, `Board`,
`Notification`, `User`) and are unaffected.

### Constraints

- `firebase/firestore` package stays in `package.json`. `Post`, `Comment`, `Reply`,
  `Notification`, `Board` still use `Timestamp`. Full Firebase elimination is out of scope.
- `supabaseReads.ts` already returns native `Date` for stats types — there are no
  `Timestamp` conversions to remove there for this scope.
- The `Timestamp` import in `supabaseReads.ts` is still needed for Board/Post/Comment/Reply
  mappers (out of scope).
- `holidays.ts` migration is conditional: the Supabase `holidays` table must exist with
  complete data before this step can ship.

### Stakeholders

- Frontend: stats page, writing streak display — no visible behavior change
- Data layer: `supabaseReads.ts`, `stats.ts`, `commenting.ts` — cleaner call paths
- Tests: `writingStatsUtils.test.ts`, `commentingContributionUtils.test.ts` — fixture updates required

---

## Goals / Non-Goals

### Goals

- Remove `toPosting`, `toCommenting`, `toReplying` wrapper functions from `stats.ts`
  and `commenting.ts`
- Change `createdAt` from `Timestamp` to `Date` in `Posting`, `Commenting`, `Replying` models
- Update the four `.toDate()` call sites to use `createdAt` directly (no `.toDate()`)
- Update test fixtures to construct models with native `Date` instead of `Timestamp.fromDate`
- Migrate `holidays.ts` from Firestore `doc`/`getDoc` to Supabase client query
  (conditional on `holidays` table precondition)
- Remove the `firebase/firestore` import from `stats.ts` and `commenting.ts`

### Non-Goals

- Changing `Post`, `Comment`, `Reply`, `Board`, `Notification`, or `User` models
- Removing `firebase/firestore` from `package.json` or from `supabaseReads.ts`
- Migrating `src/firebase.ts` or Firebase Auth
- Creating the Supabase `holidays` table schema or data migration (precondition, not in scope)

---

## Decisions

### Decision 1: Change models to native `Date`, not type-alias

**Choice**: Replace `createdAt: Timestamp` with `createdAt: Date` in all three models.

**Why not type alias**: Defining `type Timestamp = Date` eliminates the Firebase import
but misleads consumers into thinking the type has Timestamp methods (`.toDate()`,
`.toMillis()`). Any future developer could add `.toDate()` assuming it exists, and
TypeScript would not catch it because the type alias is structurally the same. The
honest fix is to use the actual type.

**Why this is safe**: The four `.toDate()` call sites are all in two utility files. Once
the model type changes to `Date`, TypeScript will produce compile errors for any missed
call sites — acting as a compile-time safety net.

### Decision 2: Audit and fix callers before changing model type

**Sequence**: Update the `.toDate()` call sites first, then change the model types.

**Why**: If the model type changes first, TypeScript shows errors in consumer code.
Fixing callers first means the model type change compiles cleanly and serves as
verification that the audit was complete. The sequence is: audit → fix callers → change
model → remove wrappers → remove imports.

**The fix pattern**: `.createdAt.toDate()` → `.createdAt`. Since `getDateKey(date: Date)`
already accepts a `Date`, no further changes are needed at the call sites.

### Decision 3: Remove wrappers, call supabase functions directly

**Choice**: `fetchPostingData` and `fetchPostingDataForContributions` in `stats.ts` call
`supabaseReads` functions and return their result directly. Same in `commenting.ts`.

**Why**: After the model type change, `toPosting(item)` becomes:
```ts
{ board: item.board, post: item.post, createdAt: item.createdAt, isRecovered: item.isRecovered }
```
This is structurally identical to `item` itself (both are `Posting`). The wrapper
becomes a pure object copy with no transformation, which is dead code.

**Return type alignment**: `SupabasePosting` is already structurally compatible with
the new `Posting` (after `createdAt: Date`), so `supabaseReads.ts` functions return the
correct type without any casting.

### Decision 4: Holidays migration approach — flat Supabase table query

**Firestore structure**: `holidays/{year}` document containing `{ items: Holiday[] }`.

**Supabase approach**: Query a `holidays` table with columns `(date TEXT, name TEXT)`,
filtering by date range instead of year shards.

```ts
// Replaces: doc(firestore, 'holidays', year) + getDoc per year
// Use year boundaries to match current behavior (fetch all holidays for covered years,
// not just those within the exact date range).
const { data, error } = await supabase
  .from('holidays')
  .select('date, name')
  .gte('date', `${startDate.getFullYear()}-01-01`)
  .lte('date', `${endDate.getFullYear()}-12-31`);

if (error) {
  console.error('Supabase fetchHolidaysForRange error:', error);
  return [];
}
```

**Why year-boundary query over exact date range**: The current Firestore implementation
fetches all holidays for each covered year without date filtering (confirmed in code).
Using year boundaries (`YYYY-01-01` / `YYYY-12-31`) preserves that behavior, preventing
silent regression where early-year holidays (e.g., Jan 1 holidays when `startDate` is
March) would be dropped by an exact date filter. This also eliminates the
`getYearsInRange` helper.

**Validation**: The returned rows still pass through `HolidaySchema` (date + name) —
the schema stays unchanged.

**Precondition gate**: `holidays.ts` migration is guarded: if the `holidays` table does
not exist or has no data, defer this step to a follow-up change. The stats cleanup
(Decisions 1–3) ships independently and has no dependency on this step.

---

## Risks / Trade-offs

**[Risk] Missed `.toDate()` call site causes runtime TypeError**
→ Mitigation: Run `npm run type-check` immediately after the model type change. TypeScript
will flag any remaining `.toDate()` calls as "Property 'toDate' does not exist on type
'Date'". The build fails loudly before any runtime exposure.

**[Risk] Holiday feature silently returns empty if Supabase table is missing/empty**
→ Mitigation: The holidays step is explicitly conditional. Merge only after confirming
the Supabase `holidays` table has data. If uncertain, defer holidays to a follow-up PR.
Empty holiday data causes incorrect streak/day-label display but does not crash the app.

**[Risk] Test fixtures break at `Timestamp.fromDate` after model type change**
→ Mitigation: Update test fixtures (`createMockPosting`, `createMockCommenting`,
`createMockReplying`) alongside the model change. Replace `Timestamp.fromDate(date)`
with `date`. Tests are co-located with the change and will fail the CI run if missed.

**[Trade-off] Single PR bundles stats cleanup + holidays migration**
→ Acceptable if holidays table precondition is confirmed. If not confirmed at PR time,
the holidays step is excluded via a feature flag or simply not included in the PR commit.

---

## Migration Plan

### Prerequisites

- [ ] Confirm `holidays` table exists in Supabase with complete data (if holidays step
  is included in this PR)
- [ ] `npm run type-check` passing on current main branch

### Step 1 — Fix call sites (no breaking change)

Update the four `.toDate()` usages in:
- `src/stats/utils/writingStatsUtils.ts` — `posting.createdAt.toDate()` → `posting.createdAt`
- `src/stats/utils/commentingContributionUtils.ts` — `c.createdAt.toDate()` → `c.createdAt`,
  `r.createdAt.toDate()` → `r.createdAt`
- `src/stats/hooks/usePostingStreak.ts` — `p.createdAt.toDate()` → `p.createdAt`

At this point, code still compiles with Timestamp models (Timestamp has `.toDate()` so
removing the call is fine; the value passed to `getDateKey` is still a `Date`).

### Step 2 — Change model types

In `src/post/model/Posting.ts`, `src/user/model/Commenting.ts`, `src/user/model/Replying.ts`:
- Replace `import type { Timestamp } from 'firebase/firestore'`  with no import
- Change `createdAt: Timestamp` to `createdAt: Date`

Run `npm run type-check`. Zero errors expected.

### Step 3 — Remove conversion wrappers

In `src/stats/api/stats.ts`:
- Delete `toPosting` function
- Remove `import { Timestamp } from 'firebase/firestore'`
- Remove `import type { SupabasePosting }` (no longer needed as explicit import)
- `fetchPostingData`: return `fetchPostingsFromSupabase(userId)` directly
- `fetchPostingDataForContributions`: return `fetchPostingsByDateRangeFromSupabase(...)` directly

In `src/user/api/commenting.ts`:
- Delete `toCommenting`, `toReplying` functions
- Remove `import { Timestamp } from 'firebase/firestore'`
- `fetchUserCommentingsByDateRange`: return `fetchCommentingsByDateRangeFromSupabase(...)` directly
- `fetchUserReplyingsByDateRange`: return `fetchReplyingsByDateRangeFromSupabase(...)` directly

### Step 4 — Update test fixtures

In `src/stats/utils/test/writingStatsUtils.test.ts`:
- Remove `import { Timestamp } from 'firebase/firestore'`
- `createMockPosting`: `createdAt: Timestamp.fromDate(date)` → `createdAt: date`

In `src/stats/utils/commentingContributionUtils.test.ts`:
- Remove `import { Timestamp } from 'firebase/firestore'`
- `createMockCommenting`, `createMockReplying`: `createdAt: Timestamp.fromDate(date)` → `createdAt: date`

Run `npm run test:run`. All tests expected to pass.

### Step 5 — Holidays migration (conditional)

**Gate**: only proceed if ALL of the following are confirmed:
- `holidays` table exists in Supabase with complete data
- RLS policy permits unauthenticated SELECT (e.g., `FOR SELECT USING (true)` for the `anon` role) — the current Firestore reads require no auth context, so the Supabase equivalent must be publicly readable

In `src/shared/api/holidays.ts`:
- Remove `import { doc, getDoc } from 'firebase/firestore'`
- Remove `import { firestore } from '@/firebase'`
- Delete `fetchHolidaysForYear` and `getYearsInRange`
- Rewrite `fetchHolidaysForRange` to query Supabase `holidays` table by date range
- `fetchHolidays` stays unchanged (still delegates to `fetchHolidaysForRange`)

### Rollback

Each step compiles and tests independently. If a step introduces failures:
- Step 1–2: Revert call site changes; model type change can be reverted safely since
  the Timestamp-typed field still accepts `.toDate()` from consumers.
- Step 5: Simply exclude the file from the PR. `holidays.ts` reverts to Firestore
  without affecting any other step.

---

## Open Questions

1. **Is the Supabase `holidays` table ready?** The shape needed is `(date TEXT, name TEXT)`
   with rows for each holiday. This must be confirmed before Step 5 can ship.

2. **Are there holiday records for multiple years?** The Firestore structure is year-sharded.
   The Supabase migration must include all years present in Firestore, not just the current year.

3. ~~**RLS on `holidays` table?**~~ Resolved — moved to Step 5 prerequisites. The table
   must allow unauthenticated SELECT before Step 5 can ship.

---

## Testability Notes

This change is a pure refactor — no new user-facing behavior. Tests verify that the
data layer contracts are preserved after removing the conversion layer.

### Layer 1 — Unit (Vitest)

**Target**: Pure utility functions that process `Posting`/`Commenting`/`Replying` arrays.

| Test target | File | What to verify |
|-------------|------|----------------|
| `accumulatePostingLengths` | `writingStatsUtils.test.ts` | `Posting` with native `Date` groups correctly by date key |
| `createContributions` | `writingStatsUtils.test.ts` | Contributions produced from `Date`-based postings match expected output |
| `aggregateCommentingContributions` | `commentingContributionUtils.test.ts` | `Commenting`/`Replying` with native `Date` bucket correctly |

**Key edge cases**:
- Same-day grouping (KST vs UTC boundary): construct fixtures using UTC dates that land
  on a KST-day boundary, e.g. `new Date('2024-01-01T15:00:00Z')` (midnight KST Jan 2)
  vs `new Date('2024-01-01T14:59:59Z')` (23:59 KST Jan 1). Verify `getDateKey` groups
  them into different days if it uses KST projection (like `computeWeekDaysFromFirstDay`).
- Empty input arrays
- Activity on days not in `workingDays`

**Fixture update pattern**:
```ts
// Before
createdAt: Timestamp.fromDate(date)
// After
createdAt: date
```
No logic changes in the tests themselves — only fixture construction changes.

### Layer 2 — Integration (Vitest)

**No new integration tests needed for the wrapper removal.**

After the wrappers are removed, `fetchPostingData`, `fetchPostingDataForContributions`,
`fetchUserCommentingsByDateRange`, and `fetchUserReplyingsByDateRange` become direct
pass-throughs (e.g., `return fetchPostingsFromSupabase(userId)`). A Vitest integration
test that mocks `supabaseReads.ts` and asserts the pass-through returns the mock value
is tautological — it tests the test harness, not application logic.

The type-correctness of the pass-through is verified by `npm run type-check` at Step 2.
Logic correctness is covered by Layer 1 unit tests on the utility functions.
If structural compatibility between `SupabasePosting` and `Posting` drifts in the future,
TypeScript will catch it at compile time before tests are needed.

### Layer 3 — E2E Network Passthrough (agent-browser + dev3000)

**Scope**: Stats page and writing streak display.

No new E2E tests are required for this refactor. The existing stats page E2E flow (if
present) verifies end-to-end behavior. The refactor should produce identical UI output.

If the stats page has no existing E2E test, one should be added to establish a baseline:
- User views stats page → contribution grid renders with correct dates
- Writing streak count is non-zero for active users

Capture dev3000 timeline during the test run to confirm no API errors or unexpected
network requests after the wrapper removal.

### Layer 4 — E2E Local DB (Supabase local Docker)

**Scope**: Holidays migration only (conditional on Step 5 shipping).

| Scenario | What to verify |
|----------|----------------|
| `fetchHolidaysForRange` with real `holidays` table | Returns correct holiday records for the given date range |
| Missing year in `holidays` table | Returns empty array without throwing |
| Date range spanning two years | Returns holidays from both years |

**RLS check**: Verify that SELECT on `holidays` table succeeds without authentication
context (or with the expected auth context, depending on the RLS policy decision).

Use Supabase local Docker (`supabase start`) — never staging or production.
