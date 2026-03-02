## ADDED Requirements

### Requirement: Native Date in Activity Models

`Posting`, `Commenting`, and `Replying` models SHALL declare `createdAt` as the native `Date` type. The Firebase `Timestamp` type SHALL NOT appear in these models.

#### Scenario: Posting model exposes createdAt as Date

WHEN a caller reads `createdAt` from a `Posting` instance
THEN the value SHALL be a native JavaScript `Date` object, not a Firebase `Timestamp`

#### Scenario: Commenting model exposes createdAt as Date

WHEN a caller reads `createdAt` from a `Commenting` instance
THEN the value SHALL be a native JavaScript `Date` object, not a Firebase `Timestamp`

#### Scenario: Replying model exposes createdAt as Date

WHEN a caller reads `createdAt` from a `Replying` instance
THEN the value SHALL be a native JavaScript `Date` object, not a Firebase `Timestamp`

---

### Requirement: Stats API Returns Supabase Data Directly

`fetchPostingData` and `fetchPostingDataForContributions` in `src/stats/api/stats.ts` SHALL return the results of `supabaseReads` functions without any intermediate conversion wrapper. No `toPosting` conversion function SHALL exist in `stats.ts`.

#### Scenario: fetchPostingData returns Supabase postings without conversion

WHEN `fetchPostingData` is called for a given user
THEN it SHALL return the result of `fetchPostingsFromSupabase` directly, with no intermediate mapping step

#### Scenario: fetchPostingDataForContributions returns Supabase postings without conversion

WHEN `fetchPostingDataForContributions` is called for a date range
THEN it SHALL return the result of `fetchPostingsByDateRangeFromSupabase` directly, with no intermediate mapping step

---

### Requirement: Commenting API Returns Supabase Data Directly

`fetchUserCommentingsByDateRange` and `fetchUserReplyingsByDateRange` in `src/user/api/commenting.ts` SHALL return the results of `supabaseReads` functions without any intermediate conversion wrapper. No `toCommenting` or `toReplying` conversion function SHALL exist in `commenting.ts`.

#### Scenario: fetchUserCommentingsByDateRange returns Supabase data without conversion

WHEN `fetchUserCommentingsByDateRange` is called for a user and date range
THEN it SHALL return the result of `fetchCommentingsByDateRangeFromSupabase` directly, with no intermediate mapping step

#### Scenario: fetchUserReplyingsByDateRange returns Supabase data without conversion

WHEN `fetchUserReplyingsByDateRange` is called for a user and date range
THEN it SHALL return the result of `fetchReplyingsByDateRangeFromSupabase` directly, with no intermediate mapping step

---

### Requirement: No Firebase Timestamp Import in Stats or Commenting APIs

`src/stats/api/stats.ts` and `src/user/api/commenting.ts` SHALL NOT import the Firebase `Timestamp` type. No Timestamp conversion (instantiation, `.toDate()`, `.toMillis()`, `.seconds`, `.nanoseconds`) SHALL occur in these files.

#### Scenario: Stats API compiles without Firebase Timestamp import

WHEN the stats API module is type-checked
THEN there SHALL be no `import { Timestamp }` or `import type { Timestamp }` from `firebase/firestore` in `stats.ts`

#### Scenario: Commenting API compiles without Firebase Timestamp import

WHEN the commenting API module is type-checked
THEN there SHALL be no `import { Timestamp }` or `import type { Timestamp }` from `firebase/firestore` in `commenting.ts`

---

### Requirement: Call Sites Use createdAt Directly

All call sites that previously invoked `.toDate()` on `Posting.createdAt`, `Commenting.createdAt`, or `Replying.createdAt` SHALL access `createdAt` directly as a `Date` value. No `.toDate()` call SHALL exist on these fields.

#### Scenario: Writing stats utility processes createdAt as Date

WHEN `writingStatsUtils` accesses `posting.createdAt` to compute a date key
THEN it SHALL pass `createdAt` directly to date utility functions, without calling `.toDate()`

#### Scenario: Commenting contribution utility processes createdAt as Date

WHEN `commentingContributionUtils` accesses `createdAt` on `Commenting` or `Replying` instances
THEN it SHALL use `createdAt` directly, without calling `.toDate()`

#### Scenario: Posting streak hook processes createdAt as Date

WHEN `usePostingStreak` accesses `createdAt` on a `Posting` to compute the streak
THEN it SHALL use `createdAt` directly, without calling `.toDate()`

---

### Requirement: Stats Utility Functions Produce Correct Output with Native Date

Stats utility functions (`accumulatePostingLengths`, `createContributions`, `aggregateCommentingContributions`) SHALL produce the same grouping and aggregation results when given models with `createdAt: Date` as they previously produced with `createdAt: Timestamp`.

#### Scenario: Same-day grouping is preserved for KST boundary dates

WHEN two `Posting` records have `createdAt` values that fall on the same calendar day in KST but different UTC days
THEN both SHALL be grouped into the same date bucket

#### Scenario: Cross-day grouping is preserved for KST boundary dates

WHEN two `Posting` records have `createdAt` values that fall on different calendar days in KST (e.g., `2024-01-01T15:00:00Z` = Jan 2 KST vs `2024-01-01T14:59:59Z` = Jan 1 KST)
THEN they SHALL be grouped into different date buckets

#### Scenario: Empty input produces empty output

WHEN stats utility functions receive empty arrays of `Posting`, `Commenting`, or `Replying`
THEN they SHALL return empty result structures without error
