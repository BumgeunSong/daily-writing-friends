# TODO: Critical Orchestrator Fixes

**Status**: Bug fix applied (defensive backstop in reducer), but proper orchestrator ordering still needed for robustness.

## Background

User bug found: posting after recovery deadline left users stuck in `eligible` forever.

**Current fix**: Reducer defensively handles "post after deadline" by detecting expired deadline and applying start-over logic.

**Proper fix**: Orchestrator should always synthesize deadline close BEFORE next-day posts, so reducer never needs to guess.

---

## 1. Orchestrator Ordering (CRITICAL)

**File**: `src/eventSourcing/projection/computeStreakProjection.ts`

**Goal**: When extending evaluation horizon, ensure expired recovery day close is synthesized BEFORE any later-day activity.

**Current issue**: `synthesizeExtensionTicks` generates ticks, but ordering with delta events may be fragile.

**Required changes**:

```typescript
// In synthesizeExtensionTicks or computeUserStreakProjection:

// 1. List all working days in extension window
const extensionDays = listWorkingDaysExclusiveInclusive(
  nextDayKey(lastEvaluatedDayKey, timezone),
  evaluationCutoff,
  timezone
);

// 2. Count posts per day (from events up to appliedSeq)
const postsByDay = await countPostsByDay(userId, extensionDays, appliedSeq);

// 3. Generate ticks for each day
const extensionTicks: Event[] = [];
for (const dayKey of extensionDays) {
  const postsCount = postsByDay[dayKey] || 0;

  if (postsCount >= 1) {
    // Day with posts → DAY_ACTIVITY
    extensionTicks.push({
      seq: 0,
      type: EventType.DAY_ACTIVITY,
      dayKey,
      createdAt: getEndOfDay(dayKey, timezone),
      payload: { postsCount }
    });
  } else if (isWorkingDayByTz(dayKey, timezone)) {
    // Working day with 0 posts → DAY_CLOSED_VIRTUAL
    extensionTicks.push({
      seq: 0,
      type: EventType.DAY_CLOSED_VIRTUAL,
      dayKey,
      createdAt: Timestamp.fromMillis(getEndOfDay(dayKey, timezone).toMillis() + 1) // After day activity
    });
  }
}

// 4. Merge with delta events and sort by (dayKey, createdAt)
const allEvents = [...extensionTicks, ...deltaEvents].sort((a, b) => {
  if (a.dayKey !== b.dayKey) return a.dayKey.localeCompare(b.dayKey);
  return a.createdAt.toMillis() - b.createdAt.toMillis();
});

// 5. Apply to reducer
const newProjection = applyEventsToPhase2Projection(currentProjection, allEvents, timezone);
```

**Verification**: Add debug logging to confirm tick order.

---

## 2. Replace lastContributionDate Fallback

**File**: `src/eventSourcing/projection/streakReducerPhase2.ts` line 380

**Current code**:
```typescript
const hadPostsOnDay = postsPerDay.has(dayKey) || dayKey === state.lastContributionDate;
```

**Issue**: `lastContributionDate` only tracks the LATEST day with posts. In multi-day extensions, this misses earlier days with posts.

**Fix**:
```typescript
// In computeUserStreakProjection, build daysWithPosts set
const daysWithPosts = new Set<string>();
for (const event of deltaEvents) {
  if (event.type === EventType.POST_CREATED) {
    daysWithPosts.add(event.dayKey);
  }
}
for (const tick of extensionTicks) {
  if (tick.type === EventType.DAY_ACTIVITY) {
    daysWithPosts.add(tick.dayKey);
  }
}

// Pass to reducer somehow, or refactor to not need this check
// Option: remove the fallback entirely and rely only on postsPerDay map
```

**Better solution**: Remove the `lastContributionDate` fallback and ensure `postsPerDay` map is always complete from events in the batch.

---

## 3. Invariant Tests (Lock in Behavior)

**File**: `src/eventSourcing/projection/__tests__/streakReducer.phase2.test.ts`

**Add these tests**:

### Test 1: Deadline expired with partial progress → start over
```typescript
it('orchestrator synthesizes close before next-day post', () => {
  let state = createInitialPhase2Projection();

  // Post once Monday from missed
  state = applyEventsToPhase2Projection(state, [
    createPostEvent('2025-10-13', 1) // Monday
  ], TZ);

  expect(state.status.type).toBe('eligible');

  // Proper orchestration: Monday close THEN Tuesday post
  state = applyEventsToPhase2Projection(state, [
    createDayClosedVirtualEvent('2025-10-13'), // Monday deadline close
    createPostEvent('2025-10-14', 2) // Tuesday post
  ], TZ);

  // After close with 1 post → start over to onStreak(1)
  // Then Tuesday post handled as onStreak
  expect(state.status.type).toBe('onStreak');
  expect(state.currentStreak).toBe(1);
});
```

### Test 2: Deadline expired with zero progress → missed
```typescript
it('deadline expires with zero progress then later post', () => {
  let state = createInitialPhase2Projection();
  state.status = { type: 'onStreak' };
  state.currentStreak = 5;

  // Miss Monday
  state = applyEventsToPhase2Projection(state, [
    createDayClosedVirtualEvent('2025-10-13') // Monday
  ], TZ);

  expect(state.status.type).toBe('eligible');
  expect(state.status.currentPosts).toBe(0);

  // Proper orchestration: Monday close THEN Tuesday post
  state = applyEventsToPhase2Projection(state, [
    createDayClosedVirtualEvent('2025-10-13'), // Monday (redundant but shows intent)
    createPostEvent('2025-10-14', 1) // Tuesday
  ], TZ);

  // After close with 0 posts → missed
  // Then Tuesday post → new eligible
  expect(state.status.type).toBe('eligible');
  expect(state.currentStreak).toBe(0);
});
```

---

## 4. Multi-Day Extension Test

**File**: `src/eventSourcing/projection/__tests__/streakReducer.phase2.test.ts`

```typescript
it('multi-day extension synthesizes correct ticks', () => {
  let state = createInitialPhase2Projection();
  state.status = { type: 'onStreak' };
  state.currentStreak = 3;
  state.lastEvaluatedDayKey = '2025-10-13'; // Monday

  // Posts on Tuesday, no posts Wednesday
  // Evaluating to Thursday

  // Orchestrator should synthesize:
  // - DAY_ACTIVITY(Tue) with postsCount=1
  // - DAY_CLOSED_VIRTUAL(Wed) for working day with 0 posts

  const events = [
    { type: 'DAY_ACTIVITY', dayKey: '2025-10-14', payload: { postsCount: 1 } }, // Tue
    { type: 'DAY_CLOSED_VIRTUAL', dayKey: '2025-10-15' }, // Wed (missed)
    createPostEvent('2025-10-16', 1) // Thu
  ];

  state = applyEventsToPhase2Projection(state, events, TZ);

  // Tuesday post → maintain onStreak
  // Wednesday miss → enter eligible
  // But wait, this test needs proper event structure...

  // TODO: Implement proper test with realistic event flow
});
```

---

## Priority Order

1. **Orchestrator ordering** (blocks production confidence)
2. **Invariant tests** (regression prevention)
3. **Multi-day extension test** (edge case coverage)
4. **lastContributionDate cleanup** (tech debt, not critical)

---

## Verification Checklist

- [ ] All 180+ tests still pass
- [ ] Manual test with explainer API: user with expired deadline shows correct recovery
- [ ] No console warnings about missing ticks
- [ ] Debug logging confirms tick order: close events always before next-day posts
- [ ] Integration test: cache stale by 3 days, compute projection, verify correct ticks synthesized

---

## Notes

The current fix (in reducer) is a **defensive backstop**. It prevents the bug from recurring, but the **ideal architecture** has the orchestrator handling event ordering, keeping the reducer simple and pure.

Consider this technical debt to address in next sprint if time permits. The current fix is production-safe but not architecturally ideal.
