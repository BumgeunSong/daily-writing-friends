# Design Review: stats-supabase-migration

**Reviewed**: 2026-03-02
**Design iterations**: 1 → 2 (design.md updated to address Important findings)
**Based on**: design.md, proposal.md (v2), proposal-review.md, supabaseReads.ts, holidays.ts

---

## 1. Architecture Reviewer

*Does the design fit existing codebase patterns and conventions? Are boundaries and interfaces well-defined? Long-horizon tradeoffs?*

### Findings

**A1 [Verified — Minor]**: `SupabasePosting` structural compatibility claim is confirmed by reading `supabaseReads.ts` (lines 94–114). `SupabasePosting`, `SupabaseCommenting`, `SupabaseReplying` already use camelCase `createdAt: Date` — the snake_case→camelCase mapping happens inside `fetchPostingsFromSupabase` and siblings. After the model type change, all three Supabase interfaces are structurally identical to their domain model counterparts. The design's compatibility assertion is correct. TypeScript `type-check` acts as the compile-time hard gate.

**A2 [Important — Fixed]**: The proposed holidays Supabase query introduced a behavioral regression not called out in the original design.

Reading `holidays.ts` (lines 53–59) shows the current `fetchHolidaysForRange` fetches **all holiday items for each covered year** — no date filtering is applied. The original design's `.gte('date', startDate.toISOString().slice(0, 10))` query would filter by exact dates, causing early-year holidays to be silently dropped when `startDate` is mid-year (e.g., the `fetchHolidays()` caller uses `lastYear = today - 1 year`, so holidays between Jan 1 and today - 1 year would be missing).

The design also stated "The Firestore approach fetches full year documents and filters client-side" — which is incorrect; there is no client-side filtering in the current code.

*Fixed in design.md*: Decision 4 now uses year-boundary expansion (`YYYY-01-01` / `YYYY-12-31`) to preserve current behavior and eliminates `getYearsInRange` just as before.

**A3 [Minor]**: `supabaseReads.ts` still imports `Timestamp` for Board/Post/Comment/Reply mappers (confirmed: lines 411, 450, 592, 675, 876). The design correctly notes this is out of scope. The mixed Firebase+Supabase import in this file is a recognized technical debt marker for future migration phases, not a defect in this design.

**A4 [Minor]**: The migration sequence (fix callers → change models → remove wrappers → update tests → conditional holidays) follows a TypeScript-safe incremental pattern where each step compiles independently. This matches the project's conventions well.

---

## 2. Security Reviewer

*Vulnerabilities, trust boundaries, authn/authz gaps, injection risks, OWASP Top 10.*

### Findings

**S1 [Important — Fixed]**: The RLS policy for the `holidays` table was left as Open Question #3. This is a deployment blocker: Supabase denies all access by default, so without an explicit `FOR SELECT USING (true)` policy for the `anon` role, all holiday reads return empty silently.

The current Firestore implementation reads without Firebase Auth context (confirmed: no auth guard in `holidays.ts`). The Supabase equivalent must allow unauthenticated SELECT.

*Fixed in design.md*: Step 5 gate now explicitly requires confirming the RLS policy permits unauthenticated SELECT before proceeding. Open Question #3 is marked resolved.

**S2 [Important — Fixed]**: The original Decision 4 code snippet showed `const { data } = await supabase...`, silently discarding the `error` field. The current `fetchHolidaysForYear` wraps each fetch in try-catch and returns `[]` on failure (lines 32–38). Dropping the error field would suppress network failures, RLS rejections, and table-not-found errors silently.

*Fixed in design.md*: Decision 4 code snippet now destructures `{ data, error }` and returns `[]` with a `console.error` on failure, matching the error handling pattern used by other `supabaseReads.ts` functions.

**S3 [Minor]**: The Supabase SDK uses parameterized queries for `.gte()` / `.lte()` filter values — no SQL injection risk from date string formatting.

**S4 [Minor]**: Holiday names come from the app's own Supabase table (not user input) and are rendered through React's default HTML escaping. XSS risk is negligible. The `holidays` table should be write-restricted to the service role via RLS (reads are public, writes are not).

---

## 3. Quality Reviewer

*Logic defects, maintainability concerns, anti-patterns, SOLID violations, complexity hotspots.*

### Findings

**Q1 [Important — Fixed]**: The original Layer 2 integration test design proposed mocking `supabaseReads.ts` to test `stats.ts` / `commenting.ts` pass-through functions. After wrapper removal, these functions reduce to single-line returns (`return fetchPostingsFromSupabase(userId)`). A Vitest test that mocks the callee and asserts the pass-through returns the mock value is tautological — it tests the test harness, not application logic.

*Fixed in design.md*: Layer 2 section now explicitly states no new integration tests are needed for the wrapper removal, and explains why TypeScript + Layer 1 unit tests provide sufficient coverage.

**Q2 [Minor]**: Decision 4 originally stated the Supabase approach is "more efficient" because it "filters client-side" (implying the Firestore implementation does client-side filtering). The actual code has no client-side filtering. The updated Decision 4 corrects this description.

**Q3 [Minor]**: Step 3 instructs removing `import type { SupabasePosting }` as "no longer needed as explicit import." This is correct only if `stats.ts` has no return type annotations explicitly typed as `SupabasePosting[]`. If such annotations exist, TypeScript will surface an error. The instruction is safe because `type-check` will catch it — accepted as a minor readability concern.

---

## 4. Testability Reviewer

*Is this design testable? Test strategy adequacy. Hard-to-test areas needing design changes.*

### Findings

**T1 [Important — Fixed]**: The "KST vs UTC boundary" edge case was listed as a key edge case in Layer 1 tests but no fixture specification was given. This is the most critical boundary for date-grouping functions: a post at 23:59 KST on day N is 14:59 UTC on day N, while a post at 00:01 KST on day N+1 is 15:01 UTC on day N.

*Fixed in design.md*: Layer 1 now includes a concrete fixture pattern:
- `new Date('2024-01-01T15:00:00Z')` — midnight KST Jan 2 (should group to Jan 2)
- `new Date('2024-01-01T14:59:59Z')` — 23:59 KST Jan 1 (should group to Jan 1)

And a reference to check whether `getDateKey` uses KST projection (consistent with `computeWeekDaysFromFirstDay` in `supabaseReads.ts`).

**T2 [Important — Fixed]**: Layer 2 integration tests designed to mock `supabaseReads.ts` and test pass-throughs are tautological. See Q1. Fixed by removing them from the design.

**T3 [Minor]**: Layer 4 (Supabase local Docker) lists three scenarios for `fetchHolidaysForRange` but omits an RLS verification scenario: "unauthenticated client can SELECT from `holidays` table without error." Given RLS is now a prerequisite gate, adding this as a Layer 4 scenario would confirm the gate was actually applied correctly. Accepted as a minor gap — the RLS gate in Step 5 prerequisites is the primary control.

**T4 [Verified — adequate]**: Test file locations and fixture update patterns are correctly specified. Two test files, clear `Timestamp.fromDate(date)` → `date` fixture change, no logic changes in test assertions.

---

## 5. Integration Reviewer

*API contracts, backward compatibility, naming consistency, integration concerns.*

### Findings

**I1 [Important — Fixed]**: The behavioral difference in `fetchHolidaysForRange` (see A2) was an integration contract change: callers receiving "all holidays for covered years" from the Firestore implementation would receive fewer holidays from the original exact-date Supabase query. The `fetchHolidays()` convenience function is the primary affected caller (passes `today - 1 year` as `startDate`).

*Fixed in design.md via A2 fix*: Year-boundary query preserves the current contract.

**I2 [Minor]**: `fetchHolidays` callers are not enumerated. Given `fetchHolidays` is a thin wrapper over `fetchHolidaysForRange` with a fixed date range, and its signature is unchanged, the integration risk is low. The year-boundary query fix (I1) eliminates the principal concern.

**I3 [Verified — no issue]**: The `SupabasePosting` / `Posting` structural compatibility is confirmed by code inspection (see A1). Direct return is type-safe after the model change.

**I4 [Minor]**: `fetchHolidaysForRange`'s return type (`Promise<Holiday[]>`) and `HolidaySchema` validation are mentioned as unchanged, but the design doesn't explicitly confirm the new Supabase implementation applies `HolidaySchema` parsing to the returned rows. The design should note that the schema validation step (currently in `YearHolidaysSchema.parse(data)`) must be preserved or replaced with per-row validation in the new implementation.

---

## Findings Summary

| ID | Perspective | Finding | Rating | Status |
|----|-------------|---------|--------|--------|
| A2 | Architecture | Holidays query used exact date filter; current impl returns all holidays for covered years — behavioral regression | **Important** | Fixed in design.md |
| S1 | Security | RLS policy for `holidays` table was an open question; needs to be a Step 5 prerequisite gate | **Important** | Fixed in design.md |
| S2 | Security | Supabase `{ data, error }` — error field silently discarded in holidays query snippet | **Important** | Fixed in design.md |
| Q1/T2 | Quality/Testability | Layer 2 integration tests mock pass-throughs — tautological, no assertion value | **Important** | Fixed in design.md |
| T1 | Testability | KST/UTC boundary edge case listed but no test fixture specification given | **Important** | Fixed in design.md |
| I1 | Integration | `fetchHolidaysForRange` contract change for callers relying on full-year results | **Important** | Covered by A2 fix |
| A1 | Architecture | `SupabasePosting` structural compatibility — VERIFIED correct from code | OK | No action |
| Q2 | Quality | Design overstated efficiency benefit of new holidays query | **Minor** | Corrected in A2 fix |
| Q3 | Quality | `SupabasePosting` import removal needs annotation check | **Minor** | Accepted |
| S3 | Security | No SQL injection risk — SDK uses parameterized queries | OK | No action |
| T3 | Testability | Layer 4 missing RLS verification scenario | **Minor** | Accepted |
| I2 | Integration | `fetchHolidays` callers not enumerated | **Minor** | Accepted |
| I4 | Integration | `HolidaySchema` validation not explicitly confirmed for new implementation | **Minor** | Accepted |

---

## Round 2 Re-review (after design.md update)

*All five Important findings addressed. Quick re-review of the updated design.*

**A2 re-check**: Year-boundary query (`YYYY-01-01` / `YYYY-12-31`) correctly matches current Firestore behavior. The updated Decision 4 explanation is accurate. No regression risk.

**S1 re-check**: Step 5 gate now includes RLS as an explicit prerequisite. Implementation cannot proceed without confirming public SELECT access. Well-controlled.

**S2 re-check**: Updated code snippet destructures `{ data, error }` and returns `[]` with `console.error` on failure — consistent with `fetchBoardsFromSupabase` error handling pattern in `supabaseReads.ts`.

**Q1/T2 re-check**: Layer 2 section correctly explains why no tests are added, with rationale. The test strategy is now clearly stratified: Layer 1 for pure logic, TypeScript for type contracts, Layer 3/4 for integration and E2E.

**T1 re-check**: KST/UTC fixture pattern is concrete and actionable. The reference to `computeWeekDaysFromFirstDay` gives implementers a clear precedent to follow.

---

## Accepted Trade-offs

- **Mixed Firebase/Supabase imports in `supabaseReads.ts`**: Board/Post/Comment/Reply still use `Timestamp`. Known coupling, explicitly out of scope for this change.
- **`HolidaySchema` validation in new implementation**: The design does not specify per-row vs. batch schema validation for Supabase results. Implementers should apply `HolidaySchema` per row (or adapt the existing `YearHolidaysSchema` pattern) — this is implementation detail, not a design-level gap.
- **Layer 2 integration tests dropped**: Pass-through code has no runtime logic to unit-test. Coverage comes from TypeScript compile gates (Step 2) + Layer 1 utility tests + Layer 3 E2E.
- **Single PR for stats cleanup + holidays**: Acceptable if both prerequisite gates (table data + RLS policy) are confirmed before merge.
