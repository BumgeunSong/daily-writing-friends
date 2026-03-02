# Proposal Review: stats-supabase-migration

**Reviewed**: 2026-03-02
**Iteration**: 1 (proposal.md updated to address Critical and Important findings)

---

## Objectives Challenger

**Is this solving the right problem?**

Yes. The codebase is mid-migration: data reads have already moved to Supabase, but `firebase/firestore` persists as an import because domain models use `Timestamp` as a date type. The wrapper functions (`toPosting`, `toCommenting`, `toReplying`) are pure type-compatibility shims with no data transformation value. This is the right thing to remove.

**Simpler ways to get the same outcome?**

A type-aliasing approach (`type Timestamp = Date`) could eliminate the Firebase import without touching models, but it creates a type lie and defers rather than solves the problem. The proposal's approach — change models to use native `Date` — is the correct solution.

**What are we really trying to achieve?**

Reduce Firebase coupling in the frontend data layer, standardize on native `Date` types, and remove dead conversion code. The proposal achieves this directly.

**Rating**: **Minor** — Objectives are well-defined. The change name "stats-supabase-migration" slightly undersells the scope, which also covers model types and holidays. Not a blocker.

---

## Alternatives Explorer

**Other approaches considered:**

1. **Type-aliasing**: Define `type Timestamp = Date` locally to drop the Firebase import without model changes. Simpler surface change, but creates a misleading type name and leaves the underlying confusion in place.

2. **Staged delivery** — split into two independent changes:
   - *Stage A* (no schema deps): Remove wrappers, change model types — ships independently, no external preconditions.
   - *Stage B* (schema dep): `holidays.ts` migration — gated on `holidays` table existence in Supabase.

   The current proposal bundles both, meaning the schema migration blocks the entire change from shipping.

3. **Skip holidays entirely for this change**: The brief explicitly says "stats API 중심으로 시작" (start with stats API). `holidays.ts` is not stats-related and has a distinct dependency profile.

**If we did nothing**: The wrapper functions remain, models keep `Timestamp`, `firebase/firestore` stays imported for types. This works but increases long-term maintenance confusion and makes future Firebase removal harder.

**Simplest version that still delivers value**: Remove wrappers + change model types. This eliminates the unnecessary `Timestamp` conversion layer with zero schema dependencies. The `holidays.ts` migration can follow once the Supabase table is confirmed ready.

**Rating**: **Important** — The holidays.ts migration bundles a schema + data dependency that could block the stats cleanup from shipping. The updated proposal addresses this by making the holidays step explicitly conditional on the precondition being met.

**Accepted trade-off**: Keeping both in one change is acceptable if the `holidays` table is already confirmed to exist with data. The updated proposal makes the precondition explicit and allows deferral.

---

## User Advocate

**User journey impact**: This is a pure data layer refactor. No visible changes to UI or behavior are expected.

**Edge cases users will hit:**

1. **`.toDate()` call sites** (Critical before fix): Firestore `Timestamp` has `.toDate()`, `.toMillis()`, `.seconds`, `.nanoseconds`. Native `Date` does not. Any component, hook, or utility calling `.toDate()` on `Posting.createdAt`, `Commenting.createdAt`, or `Replying.createdAt` will throw `TypeError: createdAt.toDate is not a function` at runtime. This is a silent ship-blocker.

2. **Holiday feature broken if table not ready**: If `holidays.ts` migrates before the Supabase `holidays` table has data, any feature relying on holiday detection will silently return empty results, causing wrong streak calculations or incorrect day labels for users.

3. **Test fixture updates**: Tests constructing `Posting`/`Commenting`/`Replying` with `Timestamp.fromDate(...)` will fail after the model type change. The proposal correctly identifies affected test files.

4. **React Query cache**: No issue expected — cache invalidation on new fetches will handle the type change naturally.

**Rating**: **Critical** (before fix) — The proposal as originally written had no step to audit call sites for Timestamp-specific method usage. The updated proposal adds this as the first step in "What Changes", making the audit an explicit precondition to the model type change.

---

## Scope Analyst

**Is the scope right-sized?**

7 source files + identified test files is a reasonable scope. Not too large to review or implement in a single change, as long as the caller audit is done first.

**Hidden dependencies:**

1. **`holidays` table schema + data migration**: The original proposal said only "schema migration required" without specifying whether it's included or a precondition. The updated proposal explicitly treats it as a precondition and allows deferral.

2. **Data parity for holidays**: Even if the `holidays` table schema exists, the holiday records (dates, regions) must match what was in Firestore. A structural migration without data is incomplete. The updated proposal now calls this out.

3. **`supabaseReads.ts` non-stats callers**: Removing `Timestamp` conversions from the stats-related return types in `supabaseReads.ts` could break other callers that depend on `Timestamp` output. The updated proposal adds a confirmation step before removing these conversions.

4. **`firebase/firestore` stays**: `Post`, `Comment`, `Reply`, `Notification`, `Like` still use `Timestamp`. The package stays in `package.json`. Full Firebase elimination is out of scope and correctly excluded.

**What could go wrong?**

- Runtime `.toDate()` errors if caller audit is skipped or incomplete (Critical risk, mitigated by adding the audit step)
- Holiday data wrong or missing if schema migration is incomplete (mitigated by explicit precondition)
- `supabaseReads.ts` breaking non-stats features (mitigated by confirmation step)

**Rating**: **Important** (before fix) — Updated proposal addresses all three hidden dependencies explicitly.

---

## Findings Summary

| Finding | Perspective | Rating | Status |
|---------|-------------|--------|--------|
| No audit step for `.toDate()` / `.toMillis()` callers on changed model fields | User Advocate | **Critical** | Fixed in proposal |
| holidays.ts bundles schema + data dependency, could block stats cleanup | Alternatives Explorer | **Important** | Fixed — explicit precondition + deferral option added |
| Unclear whether holidays table schema + data migration is included or a precondition | Scope Analyst | **Important** | Fixed in proposal |
| supabaseReads.ts changes may affect non-stats callers | Scope Analyst | **Important** | Fixed — confirmation step added |
| Change name "stats" slightly undersells scope (includes models + holidays) | Objectives Challenger | **Minor** | Accepted trade-off |

---

## Accepted Trade-offs

- **Holidays bundled in same change**: Keeping `holidays.ts` migration in scope is acceptable if the Supabase `holidays` table is confirmed to exist with data. The proposal now makes this precondition explicit rather than assuming it.
- **Change name unchanged**: "stats-supabase-migration" is the registered change name. Renaming is not worth the overhead; the scope is clear in the proposal body.
- **No staged PRs required**: A single PR is appropriate as long as the caller audit is done before the model type change.
