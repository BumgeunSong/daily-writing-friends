# Explain Reducer API Guide

## Overview

The Explain Reducer API provides a detailed, step-by-step view of how events transform a user's streak projection state. This API is designed for debugging, auditing, and understanding the streak calculation logic.

## Endpoint

```
GET /explainUserStreakProjection
```

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `uid` | string | Yes | User ID to explain projection for |
| `fromSeq` | number | No | Start sequence number (inclusive). Defaults to cached `appliedSeq` |
| `toSeq` | number | No | End sequence number (inclusive). Defaults to latest sequence |
| `includeEvents` | boolean | No | Include full event objects in response. Default: `false` |

## Response Structure

```typescript
{
  finalProjection: StreamProjectionPhase2;  // Final state after all events
  eventExplanations: EventExplanation[];     // Step-by-step transformations
  summary: ExplanationSummary;               // Aggregate statistics
}
```

### EventExplanation

Each event explanation shows:

```typescript
{
  seq: number;                    // Event sequence number
  type: 'PostCreated' | 'PostDeleted' | 'TimezoneChanged' | 'DayClosed';
  dayKey: string;                 // YYYY-MM-DD in user's timezone
  isVirtual: boolean;             // True for derived DayClosed events
  stateBefore: StreakSnapshot;    // State before this event
  stateAfter: StreakSnapshot;     // State after this event
  changes: EventChange[];         // Field-level differences
  event?: Event;                  // Full event (if includeEvents=true)
}
```

### StreakSnapshot

Captures projection state at a specific point in time:

```typescript
{
  status: string;                          // 'onStreak' | 'eligible' | 'missed'
  currentStreak: number;
  originalStreak: number;
  longestStreak: number;
  lastContributionDate: string | null;

  // Only present when status = 'eligible'
  eligibleContext?: {
    postsRequired: number;                 // 1 or 2 posts needed
    currentPosts: number;                  // Posts written so far
    deadline: string;                      // ISO timestamp
    missedDate: string;                    // ISO timestamp
  };

  // Only present when status = 'missed'
  missedContext?: {
    missedPostDates: string[];             // YYYY-MM-DD dates
  };
}
```

### EventChange

Field-level change with explanation:

```typescript
{
  field: string;        // e.g., 'status.type', 'currentStreak'
  before: any;          // Previous value
  after: any;           // New value
  reason: string;       // Human-readable explanation
}
```

### ExplanationSummary

Aggregate statistics:

```typescript
{
  totalEvents: number;              // Total events processed
  virtualClosures: number;          // Virtual DayClosed events derived
  statusTransitions: number;        // Number of status changes
  streakChanges: number;            // Number of streak value changes
  evaluatedPeriod: {
    start: string;                  // First event dayKey
    end: string;                    // Last event dayKey
  };
}
```

## Usage Examples

### 1. Explain entire projection history

```bash
curl "https://your-region.cloudfunctions.net/explainUserStreakProjection?uid=user123"
```

Shows all events from cached state to present.

### 2. Explain specific sequence range

```bash
curl "https://your-region.cloudfunctions.net/explainUserStreakProjection?uid=user123&fromSeq=10&toSeq=20"
```

Only explains events 10-20 (inclusive).

### 3. Include full event objects

```bash
curl "https://your-region.cloudfunctions.net/explainUserStreakProjection?uid=user123&includeEvents=true"
```

Each `EventExplanation` will include the full `event` object with payload data.

## Understanding the Response

### Status Transitions

The API tracks when status changes occur. Common transitions:

- `onStreak → eligible`: Missed a working day, entered recovery window
- `eligible → onStreak`: Met recovery requirement, streak restored
- `eligible → missed`: Recovery deadline passed without meeting requirement
- `missed → onStreak`: Rebuild condition met (2 posts same day or consecutive working days)

### Virtual DayClosed Events

Events with `isVirtual: true` are **not persisted** in Firestore. They are derived at read time to represent working days without posts. These events trigger state transitions just like real events.

Example:
```json
{
  "seq": 0,
  "type": "DayClosed",
  "dayKey": "2025-10-20",
  "isVirtual": true,
  "stateBefore": { "status": "onStreak", "currentStreak": 3 },
  "stateAfter": { "status": "eligible", "currentStreak": 0 },
  "changes": [
    {
      "field": "status.type",
      "before": "onStreak",
      "after": "eligible",
      "reason": "Missed working day without posts; entered recovery window"
    }
  ]
}
```

### Change Reasons

The `reason` field in `EventChange` explains **WHY** the change occurred:

- Status changes: Explains the business logic trigger
- Streak changes: Explains increment, decrement, reset, or restoration
- Field updates: Provides context for the modification

Example reasons:
- `"Streak reset due to miss (saved to originalStreak)"`
- `"Streak restored from 5 with increment"`
- `"New personal record"`
- `"Post created on new date"`

## Debugging Workflows

### Investigate unexpected streak value

1. Call API without sequence filter to see full history
2. Look at `summary.streakChanges` to find when streak changed
3. Examine `changes` array for streak modifications
4. Check `reason` field to understand the business logic

### Verify recovery logic

1. Filter to sequence range around suspected recovery period
2. Find status transition from `onStreak → eligible`
3. Track `eligibleContext.currentPosts` progression
4. Verify transition to `onStreak` when `postsRequired` met

### Audit virtual DayClosed generation

1. Filter events with `isVirtual: true`
2. Verify they only appear on working days without posts
3. Check that weekends (Sat/Sun) have no virtual closures
4. Confirm virtual events are excluded from sequences (seq=0)

### Compare real vs virtual events

1. Use `includeEvents=true` to see full event objects
2. Real events have `seq > 0` and `isVirtual: false`
3. Virtual events have `seq = 0` and `isVirtual: true`
4. Virtual events have `idempotencyKey` starting with `"virtual:"`

## Performance Considerations

- The API processes events sequentially to show state evolution
- Large sequence ranges may take longer to compute
- Use `fromSeq`/`toSeq` to limit scope when debugging specific periods
- Avoid `includeEvents=true` for large ranges (increases response size)

## Common Patterns

### Find when user entered eligible state

```typescript
const response = await fetch('/explainUserStreakProjection?uid=user123');
const data = await response.json();

const eligibleTransition = data.eventExplanations.find(exp =>
  exp.stateBefore.status === 'onStreak' &&
  exp.stateAfter.status === 'eligible'
);

console.log('Entered eligible at:', eligibleTransition.dayKey);
console.log('Recovery requirement:', eligibleTransition.stateAfter.eligibleContext);
```

### Count virtual closures in a period

```typescript
const response = await fetch('/explainUserStreakProjection?uid=user123&fromSeq=10&toSeq=50');
const data = await response.json();

console.log('Virtual closures:', data.summary.virtualClosures);
console.log('Total events:', data.summary.totalEvents);
console.log('Real events:', data.summary.totalEvents - data.summary.virtualClosures);
```

### Track streak progression over time

```typescript
const response = await fetch('/explainUserStreakProjection?uid=user123');
const data = await response.json();

const streakProgression = data.eventExplanations.map(exp => ({
  dayKey: exp.dayKey,
  type: exp.type,
  isVirtual: exp.isVirtual,
  streak: exp.stateAfter.currentStreak,
  status: exp.stateAfter.status
}));

console.table(streakProgression);
```

### Find all status transitions

```typescript
const response = await fetch('/explainUserStreakProjection?uid=user123');
const data = await response.json();

const transitions = data.eventExplanations
  .filter(exp => exp.stateBefore.status !== exp.stateAfter.status)
  .map(exp => ({
    dayKey: exp.dayKey,
    from: exp.stateBefore.status,
    to: exp.stateAfter.status,
    reason: exp.changes.find(c => c.field === 'status.type')?.reason
  }));

console.table(transitions);
```

## Error Responses

### Missing UID

```json
{
  "error": "Missing required parameter: uid"
}
```
Status: 400

### Invalid fromSeq/toSeq

```json
{
  "error": "Invalid fromSeq parameter"
}
```
Status: 400

### fromSeq > toSeq

```json
{
  "error": "fromSeq cannot be greater than toSeq"
}
```
Status: 400

### Internal error

```json
{
  "error": "Internal server error"
}
```
Status: 500

Check Cloud Function logs for details.

## Integration with Development Tools

### VS Code REST Client

```http
### Explain full projection
GET https://your-region.cloudfunctions.net/explainUserStreakProjection?uid=user123

### Explain specific range
GET https://your-region.cloudfunctions.net/explainUserStreakProjection
  ?uid=user123
  &fromSeq=10
  &toSeq=20
  &includeEvents=true
```

### curl with jq formatting

```bash
curl -s "https://your-region.cloudfunctions.net/explainUserStreakProjection?uid=user123" \
  | jq '.eventExplanations[] | {dayKey, type, isVirtual, status: .stateAfter.status}'
```

### Postman

1. Create GET request to endpoint
2. Add query params: `uid`, `fromSeq`, `toSeq`, `includeEvents`
3. Use Tests tab to extract specific data:

```javascript
const data = pm.response.json();
console.log('Status transitions:', data.summary.statusTransitions);
console.log('Virtual closures:', data.summary.virtualClosures);
```

## Best Practices

1. **Start with full history**: Call without filters first to understand overall state
2. **Narrow the scope**: Use sequence filters once you identify the problem area
3. **Check virtual events**: Verify virtual DayClosed generation is correct
4. **Follow transitions**: Track status changes to understand state machine flow
5. **Read reasons**: The `reason` fields contain valuable business logic explanations
6. **Compare with logs**: Cross-reference with Cloud Function logs for complete picture

## Related Documentation

- [Phase 2.1 Spec](../../../docs/phase-2-1-spec.md): On-demand projection architecture
- [Streak Reducer Phase 2](../streakReducerPhase2.ts): Core projection logic
- [Derive Virtual Closures](../deriveVirtualClosures.ts): Virtual event generation
- [Compute Streak Projection](../computeStreakProjection.ts): On-demand computation flow
