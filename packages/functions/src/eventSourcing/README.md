# Event Sourcing Streak System

**Version**: Phase 3 (Backfill Complete)
**Last Updated**: 2025-10-29

## Overview

The streak system uses event sourcing to maintain accurate user writing streaks with recovery mechanics. Instead of storing state directly, we persist immutable events and compute projections on-demand.

### Architecture Components

```
┌─────────────┐
│   Append    │  Write events (POST_CREATED, POST_DELETED, etc.)
│   Layer     │  Assign sequential IDs, persist to Firestore
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│   Event Stream      │  Immutable log per user
│ users/{uid}/events  │  Sequential, timestamped, typed
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Projection Layer   │  Reduce events → current streak state
│  computeProjection  │  Cache results, extend evaluation window
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│   Cached State      │  Latest computed projection
│ streak_es/current   │  appliedSeq, lastEvaluatedDayKey
└─────────────────────┘
```

## Event Types

### Core Events

- **`POST_CREATED`**: User created a post
  - Payload: `{ postId, boardId, contentLength }`
  - Triggers streak progression checks

- **`POST_DELETED`**: User deleted a post
  - Payload: `{ postId, boardId }`
  - May adjust recovery progress if in eligible state

- **`TIMEZONE_CHANGED`**: User changed timezone
  - Payload: `{ oldTimezone, newTimezone }`
  - Invalidates cached projection

### Derived Events (Virtual)

These events are **not persisted** but synthesized during projection:

- **`DAY_ACTIVITY`**: Working day with ≥1 posts (used in extension window)
  - Payload: `{ postsCount }`
  - Represents cached activity when extending evaluation horizon

- **`DAY_CLOSED_VIRTUAL`**: Working day with 0 posts
  - Emitted when evaluation window extends past cached state
  - Triggers miss detection and recovery transitions

## Streak Rules

### State Machine

```
  ┌──────────┐
  │ onStreak │ ◄─── Initial state after first post from missed
  └────┬─────┘
       │ post on NEW working day → streak +1 (daily increment)
       │ miss working day (0 posts)
       ▼
  ┌──────────┐
  │ eligible │ ─── Recovery window (first miss only)
  └────┬─────┘
       │
       ├─── 2+ posts on recovery day ──► onStreak (originalStreak + 1)
       ├─── 1 post on recovery day ────► onStreak (start over, streak=1)
       └─── 0 posts on recovery day ───► missed
                                           │
                                           └─── 1+ post on working day ──► onStreak(1)
```

### Daily Streak Increment

**Phase 2.2 Key Feature**: Streaks increment daily like traditional login streaks.

When posting while `onStreak`:
- **Same day** (dayKey === lastContributionDate): No change to streak
- **New working day** (dayKey > lastContributionDate): `streak += 1`
- **Weekend posts**: No penalty, but no increment (neutral)

Example:
```
Mon: Post → onStreak(1)
Tue: Post → onStreak(2)  ✓ increments
Tue: Post again → onStreak(2)  (same day, no change)
Wed: Post → onStreak(3)  ✓ increments
```

### Recovery Windows

Recovery windows exist only for FIRST miss from `onStreak`.

**Weekday Miss (Mon-Thu)**:
- `postsRequired = 2`
- `deadline = end of next working day`
- Successful recovery: `streak = originalStreak + 1` (increment for recovery day)

**Friday Miss**:
- `postsRequired = 1`
- `deadline = end of Saturday`
- Successful recovery: `streak = originalStreak + 1`

**Partial recovery** (< postsRequired on deadline):
- Start over with `streak = 1`

**Zero recovery** (0 posts on deadline):
- Transition to `missed`

### Posting from Missed State

**Policy**: No recovery window from `missed`. First post immediately restarts streak.

- First post on working day → `onStreak(1)`
- Additional posts same day → stays `onStreak(1)` (same-day rule)
- Post on next working day → `onStreak(2)` (daily increment)

## Projection System

### On-Demand Computation

```typescript
computeUserStreakProjection(userId, now) → StreamProjectionPhase2
```

**Workflow**:
1. Load cached projection (appliedSeq, lastEvaluatedDayKey)
2. Load delta events since appliedSeq
3. Determine evaluation cutoff (optimistic):
   - Posted today? → evaluate up to today
   - Haven't posted? → evaluate only up to yesterday
4. Synthesize extension ticks for gap between cache and cutoff
5. Merge and sort all events by (dayKey, createdAt)
6. Reduce events through state machine
7. Persist updated cache (write-behind)
8. Return projection immediately

### Optimistic Evaluation

- **Goal**: Give users immediate streak feedback when they post
- **Logic**: Check if user posted today by querying events directly
- **Benefit**: Real-time UI updates without waiting for nightly batch

### Extension Tick Synthesis

When cache is stale (e.g., user inactive for 3 days), orchestrator:
1. Lists working days in [lastEvaluatedDayKey, evaluationCutoff]
2. Queries posts per day from event log (up to appliedSeq)
3. For each day:
   - ≥1 posts → emit `DAY_ACTIVITY {postsCount}`
   - 0 posts → emit `DAY_CLOSED_VIRTUAL`
4. Merges with delta events, sorts by (dayKey, createdAt)

**Ordering guarantee**: `DAY_CLOSED_VIRTUAL` events timestamped +1ms after day end, ensuring they process AFTER any posts from that day.

## State Projection Schema

```typescript
interface StreamProjectionPhase2 {
  status: StreakStatus;           // onStreak | eligible | missed
  currentStreak: number;          // Current streak count
  originalStreak: number;         // Streak before entering eligible (frozen)
  longestStreak: number;          // All-time best
  lastContributionDate: string | null; // YYYY-MM-DD
  appliedSeq: number;             // Last processed event sequence
  lastEvaluatedDayKey: string;    // Last day evaluated (YYYY-MM-DD)
  projectorVersion: string;       // 'phase2.1-no-crossday-v1'
}

type StreakStatus =
  | { type: 'onStreak' }
  | {
      type: 'eligible';
      postsRequired: 1 | 2;       // Recovery requirement
      currentPosts: number;        // Progress toward requirement
      deadline: Timestamp;         // Recovery deadline
      missedDate: Timestamp;       // Day missed
    }
  | { type: 'missed' };
```

## Key Implementation Files

### Append Layer
- [`append/appendEvent.ts`](append/appendEvent.ts) - Write events to user's stream
- [`append/computeDayKey.ts`](append/computeDayKey.ts) - Timezone-aware date calculation

### Backfill Layer (Phase 3)
- [`backfill/extractEventsFromPostings.ts`](backfill/extractEventsFromPostings.ts) - Pure functions: extract events from postings
- [`backfill/backfillUserEventsDb.ts`](backfill/backfillUserEventsDb.ts) - Full rebuild: delete + recreate events chronologically
- [`backfill/backfillEventsHttp.ts`](backfill/backfillEventsHttp.ts) - HTTP endpoint for backfill

### Projection Layer
- [`projection/computeStreakProjection.ts`](projection/computeStreakProjection.ts) - Orchestrator (on-demand)
- [`projection/streakReducerPhase2.ts`](projection/streakReducerPhase2.ts) - Pure reducer (state machine)
- [`projection/projectStreakForUser.ts`](projection/projectStreakForUser.ts) - Event-triggered projection update
- [`projection/loadDeltaEvents.ts`](projection/loadDeltaEvents.ts) - Query events since cache
- [`projection/saveProjectionCache.ts`](projection/saveProjectionCache.ts) - Persist cache

### Utilities
- [`utils/workingDayUtils.ts`](utils/workingDayUtils.ts) - Working day detection, recovery window logic
- [`types/Event.ts`](types/Event.ts) - Event type definitions
- [`types/StreamProjectionPhase2.ts`](types/StreamProjectionPhase2.ts) - Projection state schema

## Testing

### Test Coverage

**Phase 2 Reducer**: 43 tests ([`__tests__/streakReducer.phase2.test.ts`](projection/__tests__/streakReducer.phase2.test.ts))
**Backfill Core**: 14 tests ([`backfill/__tests__/extractEventsFromPostings.test.ts`](backfill/__tests__/extractEventsFromPostings.test.ts))

**Total: 147 tests passing**

### Testing Strategy

1. **Unit tests**: Reducer is pure function, easy to test
2. **Orchestrator tests**: Mock Firestore, verify tick synthesis
3. **Integration tests**: Full flow from events to projection
4. **Invariant checks**: Runtime guards in development/test mode

### Common Test Patterns

```typescript
// Setup initial state
let state = createInitialPhase2Projection();
state.status = { type: 'onStreak' };
state.currentStreak = 5;

// Apply events
state = applyEventsToPhase2Projection(state, [
  createPostEvent('2025-10-15', 1),
  createDayClosedVirtualEvent('2025-10-16')
], 'Asia/Seoul');

// Assert outcome
expect(state.status.type).toBe('eligible');
expect(state.currentStreak).toBe(0);
expect(state.originalStreak).toBe(5); // Frozen
```

## Debugging Tools

### Explain Reducer API

**Endpoint**: `GET /explainUserStreakProjection?uid={userId}`

Returns step-by-step event processing with:
- State before/after each event
- Field-level changes with reasons
- Virtual event generation
- Status transition tracking

**Query Parameters**:
- `uid` (required): User ID
- `fromSeq` (optional): Start sequence
- `toSeq` (optional): End sequence
- `includeEvents` (optional): Include full event objects

**Example Response**:
```json
{
  "finalProjection": { "status": { "type": "onStreak" }, "currentStreak": 5 },
  "eventExplanations": [
    {
      "seq": 42,
      "type": "PostCreated",
      "dayKey": "2025-10-15",
      "isVirtual": false,
      "stateBefore": { "status": "eligible", "currentStreak": 0 },
      "stateAfter": { "status": "eligible", "currentStreak": 0 },
      "changes": [
        {
          "field": "eligibleContext.currentPosts",
          "before": 1,
          "after": 2,
          "reason": "Second post on recovery day; requirement met"
        }
      ]
    }
  ],
  "summary": {
    "totalEvents": 15,
    "virtualClosures": 3,
    "statusTransitions": 2,
    "streakChanges": 4
  }
}
```

**Usage**:
```bash
# Explain full projection history
curl "https://region.cloudfunctions.net/explainUserStreakProjection?uid=user123"

# Explain specific range
curl "https://region.cloudfunctions.net/explainUserStreakProjection?uid=user123&fromSeq=10&toSeq=20"

# With full event objects
curl "https://region.cloudfunctions.net/explainUserStreakProjection?uid=user123&includeEvents=true"
```

### Debug Workflows

**Investigate unexpected streak**:
1. Call explain API without filters
2. Check `summary.streakChanges` count
3. Examine `changes[].reason` for each streak modification
4. Verify business logic matches expected rules

**Verify recovery logic**:
1. Filter to recovery period sequence range
2. Find `onStreak → eligible` transition
3. Track `eligibleContext.currentPosts` progression
4. Confirm `eligible → onStreak` when requirement met

**Audit virtual closures**:
1. Filter events with `isVirtual: true`
2. Verify only on working days without posts
3. Check weekends have no virtual closures
4. Confirm virtual events have `seq: 0`

## Invariants

### Development-Time Guards

The reducer enforces these invariants (throws in dev/test, silent in prod):

1. **originalStreak never mutates while onStreak**
   - `originalStreak` only changes when entering/exiting eligible
   - Posting while onStreak leaves it unchanged

2. **Friday miss requires postsRequired=1**
   - Friday recovery only needs 1 post
   - Restoration increment is +1 (not +2)

3. **Weekend neutrality**
   - Saturday/Sunday DAY_CLOSED never penalize streak
   - Only working days (Mon-Fri) trigger miss detection

4. **Extension ticks never synthesize both**
   - Never emit both DAY_ACTIVITY and DAY_CLOSED_VIRTUAL for same day
   - One or the other, never both

5. **Evaluation cutoff sanity**
   - lastEvaluatedDayKey only advances to evaluationCutoff
   - Never jumps multiple days without ticks

### Runtime Checks

See [`streakReducerPhase2.ts`](projection/streakReducerPhase2.ts) for validation logic:
- `validateOriginalStreakMutation()` - Lines 15-47
- DAY_ACTIVITY/DAY_CLOSED_VIRTUAL conflict check - Lines 119-139 in computeStreakProjection
- Extension gap detection - Lines 262-274 in computeStreakProjection

## Migration & Versioning

### Current Version

`projectorVersion: 'phase2.2-daily-increment-v1'`

### Phase 3: Historical Event Backfill

**Status**: Completed (2025-10-29)
**Changes**:
- Removed Phase 1 legacy code (recoveryStatus module)
- Implemented full event stream rebuild from posting history
- Events now chronologically ordered by createdAt

**Backfill Process**:
1. Delete all existing events for user
2. Extract events from `users/{uid}/postings` (ordered by createdAt ASC)
3. Write events with seq 1..N in chronological order
4. Update `eventMeta.lastSeq`

**HTTP Endpoint**:
```bash
# Single user
curl -X POST "https://REGION.cloudfunctions.net/backfillHistoricalEventsHttp?userId={uid}"

# All users
curl -X POST "https://REGION.cloudfunctions.net/backfillHistoricalEventsHttp?all=true"
```

## Performance Considerations

### Query Optimization

- **Cache hits**: Most reads served from cached projection (< 10ms)
- **Cache misses**: Recompute from events (50-200ms depending on event count)
- **Extension ticks**: Query events by dayKey + seq range (indexed)

### Scaling

- **Per-user event log**: Scales horizontally
- **No cross-user queries**: No hot spots
- **Cached projections**: Read-heavy workload optimized

## Common Pitfalls

### ❌ Don't persist DAY_CLOSED events
- Legacy Phase 1 pattern, no longer used
- Use virtual derivation instead

### ❌ Don't assume events arrive in order
- Events have `seq` for ordering, not creation timestamp
- Always sort by `seq` before reducing

### ❌ Don't mutate state in reducer
- Pure function: `newState = { ...state }`
- Helps debugging, enables time-travel

### ❌ Don't rely on lastContributionDate alone
- Only tracks LATEST day with posts
- Use `postsPerDay` map for multi-day tracking
- `lastContributionDate` fallback only for split-batch scenarios (mainly tests)

## Monitoring

### Key Metrics

- **Projection computation time**: P50, P95, P99
- **Cache hit rate**: % of reads served from cache
- **Virtual closure generation**: Count per evaluation
- **Status transition frequency**: onStreak ↔ eligible ↔ missed

### Alerts

- Cache computation > 500ms (P95)
- Warmup job failures
- Invariant violations in test environment

## Future Enhancements

### Potential Improvements

1. **Multi-day recovery window**: Allow posts across multiple days to accumulate
2. **Flexible working days**: Per-user configurable (e.g., exclude specific days)
3. **Streak freeze**: Planned breaks that don't break streaks
4. **Team streaks**: Collaborative writing goals

### Non-Goals

- Real-time push notifications (handled by separate notification system)
- Historical analytics (use BigQuery export)
- Cross-board streak aggregation

## References

### Internal Documentation

- Phase 2.1 architecture decisions (archived)
- Previous versions: Phase 1, Phase 2.0 (with cross-day rebuild)

### Related Systems

- Notification system: Triggers on status changes
- Writing history: Aggregates daily stats
- Badge system: Awards based on streak milestones

## Support

For questions or issues:
1. Check explain API for unexpected behavior
2. Review test cases for similar scenarios
3. Examine Cloud Function logs for errors
4. Consult this README for architecture overview

---

**Last verified**: 2025-10-29 | Phase 3 complete | 147 tests passing
