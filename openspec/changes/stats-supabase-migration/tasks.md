## 1. Fix Consumer Call Sites

- [ ] 1.1 In `src/stats/utils/writingStatsUtils.ts` replace `posting.createdAt.toDate()` with `posting.createdAt` (line 12)
- [ ] 1.2 In `src/stats/utils/commentingContributionUtils.ts` replace `c.createdAt.toDate()` with `c.createdAt` and `r.createdAt.toDate()` with `r.createdAt` (lines 20, 24)
- [ ] 1.3 In `src/stats/hooks/usePostingStreak.ts` replace `p.createdAt.toDate()` with `p.createdAt` (line 23)
- [ ] 1.4 Run `npm run type-check` — expect zero errors (models still type as `Timestamp`, which is a superset of `Date` for these usages)

## 2. Migrate Models and Remove Wrappers

- [ ] 2.1 In `src/post/model/Posting.ts` remove `import type { Timestamp } from 'firebase/firestore'` and change `createdAt: Timestamp` to `createdAt: Date`
- [ ] 2.2 In `src/user/model/Commenting.ts` remove `import type { Timestamp } from 'firebase/firestore'` and change `createdAt: Timestamp` to `createdAt: Date`
- [ ] 2.3 In `src/user/model/Replying.ts` remove `import type { Timestamp } from 'firebase/firestore'` and change `createdAt: Timestamp` to `createdAt: Date`
- [ ] 2.4 Run `npm run type-check` — TypeScript will surface any remaining `.toDate()` call sites missed in Group 1; fix any that appear
- [ ] 2.5 In `src/stats/api/stats.ts` delete the `toPosting` function, remove `import { Timestamp } from 'firebase/firestore'`, update `fetchPostingData` to return `fetchPostingsFromSupabase(userId)` directly, update `fetchPostingDataForContributions` to return `fetchPostingsByDateRangeFromSupabase(...)` directly
- [ ] 2.6 In `src/user/api/commenting.ts` delete `toCommenting` and `toReplying` functions, remove `import { Timestamp } from 'firebase/firestore'`, update `fetchUserCommentingsByDateRange` and `fetchUserReplyingsByDateRange` to return Supabase functions directly
- [ ] 2.7 In `src/stats/utils/test/writingStatsUtils.test.ts` remove `import { Timestamp } from 'firebase/firestore'` and update `createMockPosting` to use `createdAt: date` instead of `createdAt: Timestamp.fromDate(date)`
- [ ] 2.8 In `src/stats/utils/commentingContributionUtils.test.ts` remove `import { Timestamp } from 'firebase/firestore'` and update `createMockCommenting` and `createMockReplying` to use `createdAt: date` instead of `createdAt: Timestamp.fromDate(date)`
- [ ] 2.9 Run `npm run type-check` — expect zero errors
- [ ] 2.10 Run `npm run test:run` — expect all tests to pass

## 3. Holidays Migration (Conditional)

> **Gate**: Only implement this group after confirming: (1) `holidays` table exists in Supabase with complete data for all Firestore years, and (2) RLS policy allows unauthenticated `anon` role SELECT.

- [ ] 3.1 In `src/shared/api/holidays.ts` remove `import { doc, getDoc } from 'firebase/firestore'` and `import { firestore } from '@/firebase'`
- [ ] 3.2 Delete the `fetchHolidaysForYear` and `getYearsInRange` helper functions from `holidays.ts`
- [ ] 3.3 Rewrite `fetchHolidaysForRange` to query the Supabase `holidays` table using year-boundary dates: `.gte('date', `${startDate.getFullYear()}-01-01`)` and `.lte('date', `${endDate.getFullYear()}-12-31`)`, return `[]` on error with `console.error`
- [ ] 3.4 Leave `fetchHolidays` unchanged — it still delegates to `fetchHolidaysForRange`
- [ ] 3.5 Run `npm run type-check` — expect zero errors

## Tests

### Unit

- [ ] T.1 (Vitest) Verify `writingStatsUtils.test.ts` passes with `createdAt: Date` fixtures — run `npm run test:run -- src/stats/utils/test/writingStatsUtils.test.ts`
- [ ] T.2 (Vitest) Verify `commentingContributionUtils.test.ts` passes with `createdAt: Date` fixtures — run `npm run test:run -- src/stats/utils/commentingContributionUtils.test.ts`
- [ ] T.3 (Vitest) Add KST-boundary same-day grouping test: two `Posting` records where `2024-01-01T14:59:59Z` (Jan 1 KST) and `2024-01-01T15:00:00Z` (Jan 2 KST) land in different date buckets
- [ ] T.4 (Vitest) Add empty-input test: `accumulatePostingLengths([])`, `createContributions([], ...)`, `aggregateCommentingContributions([], [], ...)` each return empty result structures without error

### Integration

- [ ] T.5 (Vitest) No new integration tests required for the wrapper removal — pass-throughs are verified by type-check at task 2.9; confirm existing integration test suite passes with `npm run test:run`

### E2E

- [ ] T.6 (agent-browser) Load the stats page for a user with known activity; confirm the contribution grid renders with correct dates and no console errors
- [ ] T.7 (agent-browser) Load the writing streak display; confirm streak count is non-zero for an active user and matches expected value
- [ ] T.8 (Supabase local) For holidays migration only: run `fetchHolidaysForRange` against local Supabase Docker with seeded `holidays` table; assert correct holiday records are returned for a single-year range
- [ ] T.9 (Supabase local) For holidays migration only: call `fetchHolidaysForRange` with a date range spanning two calendar years; assert holidays from both years are returned
- [ ] T.10 (Supabase local) For holidays migration only: simulate Supabase query error (or missing table); assert `fetchHolidaysForRange` returns `[]` and logs the error without throwing
- [ ] T.11 (Supabase local) For holidays migration only: verify unauthenticated `anon` role SELECT on `holidays` table succeeds (RLS allows read); verify INSERT/UPDATE/DELETE are rejected
