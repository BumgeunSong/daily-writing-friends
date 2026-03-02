## Why

The codebase has already migrated Firestore data reads to Supabase, but `firebase/firestore` remains an active import dependency because domain models (`Posting`, `Commenting`, `Replying`, `Post`, `Comment`, etc.) use the Firestore `Timestamp` type for dates. This forces wrapper functions in `src/stats/api/stats.ts` and `src/user/api/commenting.ts` to convert Supabase `Date` values back to `Timestamp` purely for type compatibility — adding indirection with no data benefit. Additionally, `src/shared/api/holidays.ts` is the last file performing actual Firestore reads (`doc`, `getDoc`). Removing these dependencies simplifies the data layer and eliminates a dead dependency.

## What Changes

- Remove `Timestamp` conversion wrappers (`toPosting`, `toCommenting`, `toReplying`) from `src/stats/api/stats.ts` and `src/user/api/commenting.ts`; call `supabaseReads` functions directly
- Replace `createdAt: Timestamp` with `createdAt: Date` in the `Posting`, `Commenting`, and `Replying` models (`src/post/model/Posting.ts`, `src/user/model/Commenting.ts`, `src/user/model/Replying.ts`)
- Remove `Timestamp` imports from `src/stats/api/stats.ts` and `src/user/api/commenting.ts` after wrappers are gone
- Migrate `src/shared/api/holidays.ts` from Firestore (`doc`/`getDoc`) to Supabase (`holidays` table), following the `supabaseReads.ts` pattern
- Remove `Timestamp` conversions from `src/shared/api/supabaseReads.ts` for stats-related return types once callers no longer need them
- Delete any Firestore read helper code that is no longer called after the above changes

## Capabilities

### New Capabilities

- `stats-supabase-direct-reads`: Stats API (`src/stats/api/stats.ts`) fetches posting, commenting, and replying data directly from Supabase with native `Date` types, with no intermediate Firestore `Timestamp` conversion layer. `Posting`, `Commenting`, and `Replying` models use `Date` for `createdAt`.
- `holidays-supabase-read`: Holiday data is read from a Supabase `holidays` table instead of Firestore. `fetchHolidaysForRange` and `fetchHolidays` use the Supabase client following the `supabaseReads.ts` pattern.

### Modified Capabilities

_(No existing specs to update — specs directory is empty.)_

## Impact

**Files modified:**
- `src/stats/api/stats.ts` — remove `Timestamp` import and `toPosting` wrapper; call `fetchPostingsFromSupabase` / `fetchPostingsByDateRangeFromSupabase` directly
- `src/user/api/commenting.ts` — remove `Timestamp` import and `toCommenting`/`toReplying` wrappers; return Supabase types directly or update return types to `Date`
- `src/post/model/Posting.ts` — change `createdAt` from `Timestamp` to `Date`
- `src/user/model/Commenting.ts` — change `createdAt` from `Timestamp` to `Date`
- `src/user/model/Replying.ts` — change `createdAt` from `Timestamp` to `Date`
- `src/shared/api/holidays.ts` — replace Firestore read with Supabase client call
- `src/shared/api/supabaseReads.ts` — remove `Timestamp` conversions for Posting/Commenting/Replying return types

**Test files affected:**
- `src/stats/utils/commentingContributionUtils.test.ts`
- `src/stats/utils/test/writingStatsUtils.test.ts`
- Any test constructing `Posting`/`Commenting`/`Replying` with `Timestamp.fromDate(...)`

**Dependencies:**
- `firebase/firestore` package import surface shrinks; still needed for models not yet migrated (`Post`, `Comment`, `Reply`, `Notification`, `Like`) — full elimination is out of scope for this change
- Supabase `holidays` table must exist before `holidays-supabase-read` can ship (schema migration required)

**No breaking changes to external APIs or UI behavior** — the migration is internal to the data layer.
