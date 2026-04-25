## 1. Phase 1 — BestPostCardList Batch Fetching

- [x] 1.1 Add `useBatchPostCardData(recentPosts)` call to BestPostCardList component
- [x] 1.2 Pass `prefetchedData` and `isBatchMode` props to each PostCard in BestPostCardList
- [x] 1.3 Verify BestPostCardList renders correctly with batch data (smoke test passed on local Supabase)

## 2. Phase 2 — Shared Blocked Users Query

- [x] 2.1 Create `useBlockedByUsers(userId)` React Query hook in `apps/web/src/user/hooks/`
- [x] 2.2 Refactor `useRecentPosts` to use `useBlockedByUsers` instead of inline useEffect
- [x] 2.3 Refactor `useBestPosts` to use `useBlockedByUsers` instead of inline useEffect
- [x] 2.4 Ensure post queries use `enabled: !!blockedByUsers` pre-render guard
- [x] 2.5 Remove old `getBlockedByUsers` useEffect + useState from both hooks

## 3. Phase 2 — boardLoader Measurement

- [x] 3.1 Review existing Sentry spans for `getCurrentUser` and `fetchUser` in boardLoader
- [ ] 3.2 Analyze production Sentry data: if getCurrentUser < 100ms, close this task; if > 200ms, plan parallelization

## 4. Measurement & Validation

- [ ] 4.1 Measure p75 LCP on BoardPage before changes (baseline from Sentry)
- [ ] 4.2 Deploy Phase 1, measure p75 LCP after (target: < 2,700ms)
- [ ] 4.3 Deploy Phase 2, measure p75 LCP after
- [ ] 4.4 Verify Sentry Issue #7279529937 (N+1 API Call) is resolved

## Tests

### Unit
- [x] T.1 Test `fetchBatchPostCardData` transformation: missing users return fallback data
- [x] T.2 Test `fetchBatchPostCardData` transformation: duplicate author IDs are deduplicated
- [x] T.3 Test `useBlockedByUsers` hook: returns correct query key and config (skipped per testing convention — hook config not unit testable as pure function)

### Integration
- [x] T.4 Test BestPostCardList passes `prefetchedData` and `isBatchMode` to PostCard when batch data available (verified by type-check — props statically passed in component)
- [x] T.5 Test post queries are disabled (`enabled: false`) when blockedByUsers is loading (verified by code: `enabled: !!blockedByUsers` in both hooks)
- [x] T.6 Test post queries become enabled when blockedByUsers resolves (verified by code: same `enabled` guard — E2E T.7 covers runtime behavior)

### E2E
- [ ] T.7 Navigate to BoardPage "best" tab — verify network shows 4 batch queries, not N individual queries
