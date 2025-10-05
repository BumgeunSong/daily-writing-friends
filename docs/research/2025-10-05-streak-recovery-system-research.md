---
date: 2025-10-05T19:00:00+09:00
researcher: Claude Code
git_commit: 3e17c04
branch: feat/streak-v2
repository: DailyWritingFriends
topic: "Streak Calculation and Recovery System Architecture"
tags: [research, codebase, streak-system, recovery-logic, firebase-functions]
status: complete
last_updated: 2025-10-05
---

# Research: Streak Calculation and Recovery System Architecture

## Research Question

How does the streak calculation and recovery system work in this codebase? What are the core components, business rules, state transitions, and implementation patterns?

## Summary

The DailyWritingFriends app implements a sophisticated **3-state streak recovery system** that allows users to maintain writing streaks while providing recovery opportunities when they miss working days. The system operates in Asia/Seoul timezone and distinguishes between weekdays (Mon-Fri) as working days and weekends (Sat-Sun) as non-working days.

The architecture is built on **pure functional principles** with clear separation between:
- **Pure business logic** (testable, deterministic state transitions)
- **Database operations** (side effects isolated to wrapper functions)
- **Orchestration layer** (coordinates transitions for posting and midnight events)

Key innovations include:
- **Optimistic streak display** - shows yesterday's streak before posting, then increments immediately
- **Differential recovery policies** - Friday misses are easier to recover (+1) than weekday misses (+2)
- **Partial progress preservation** - failed recoveries retain partial post counts
- **Dual recovery paths** - same-day two-post recovery or cross-day building

## Detailed Findings

### 1. System Overview - The 3-State Recovery Model

#### Three Core States

The system models user writing behavior through three distinct states stored in `StreakInfo`:

1. **onStreak** - User is actively maintaining their writing streak
   - Increments daily with each working day post
   - Represents successful streak maintenance

2. **eligible** - User missed a working day but can still recover
   - Provides a recovery window with specific requirements
   - Tracks partial progress toward recovery
   - Has a deadline (end of next day after miss)

3. **missed** - User failed recovery and must rebuild their streak
   - Can rebuild through two paths: same-day 2-post or cross-day accumulation
   - Preserves partial progress from failed recovery attempts

#### State Transition Triggers

Transitions occur through two primary triggers:

1. **Posting Events** (`onPostingCreated`)
   - Real-time transitions when users create posts
   - Path: `functions/src/postings/onPostingCreated.ts`

2. **Midnight Job** (`updateRecoveryStatusOnMidnightV2`)
   - Scheduled function running at 00:00 KST daily
   - Path: `functions/src/recoveryStatus/updateRecoveryStatusOnMidnightV2.ts`
   - Processes time-based transitions (recovery deadlines, missed day detection)

### 2. Core Components and Responsibilities

#### Module Architecture

The system follows a layered architecture with clear separation of concerns:

```
recoveryStatus/
├── StreakInfo.ts              # Type definitions and interfaces
├── stateTransitions.ts        # Main API (re-exports from other modules)
├── transitionLogic.ts         # Pure business logic functions
├── transitionWrappers.ts      # Database wrapper functions
├── transitionOrchestrators.ts # High-level orchestration
├── streakCalculations.ts      # Streak counting algorithms
├── recoveryUtils.ts           # Recovery-specific utilities
└── streakUtils.ts             # Streak info CRUD operations
```

#### Key Module Responsibilities

**transitionLogic.ts** - Pure Business Logic
- `calculateOnStreakToEligiblePure()` - Detects missed working days
- `calculateEligibleToOnStreakPure()` - Handles recovery completion
- `calculateEligibleToMissedPure()` - Processes recovery failures
- `calculateMissedToOnStreakPure()` - Manages streak rebuilding
- All functions are pure (no side effects, fully testable)

**transitionWrappers.ts** - Database Layer
- Wraps pure functions with database operations
- Fetches StreakInfo and posting data
- Delegates logic to pure functions
- Applies updates to Firestore

**transitionOrchestrators.ts** - Coordination Layer
- `calculatePostingTransitions()` - Routes posting events to appropriate handlers
- `calculateMidnightTransitions()` - Routes midnight events to appropriate handlers
- Uses switch statements for clean state-based routing

**streakCalculations.ts** - Calculation Algorithms
- `calculateCurrentStreakPure()` - Counts consecutive working day posts
- `calculateLongestStreakPure()` - Finds maximum streak in history
- `buildPostingDaysSet()` - Converts posting data to date set
- Optimized versions for large datasets

**calendar.ts** (shared) - Timezone & Date Logic
- ALL date/timezone operations centralized here
- Seoul timezone (Asia/Seoul) enforcement
- Working day calculations (Mon-Fri = working, Sat-Sun = non-working)
- Recovery deadline calculations

### 3. Business Rules - Recovery Policies

#### Recovery Requirements by Day Type

The system implements differential recovery policies based on which day was missed:

**Monday-Thursday Miss:**
- Recovery window: Next working day only
- Posts required: 2
- Streak increment on success: `originalStreak + 2`
- Rationale: Represents both the missed day (+1) and recovery day (+1)

**Friday Miss:**
- Recovery window: Saturday only (NOT Sunday)
- Posts required: 1
- Streak increment on success: `originalStreak + 1`
- Rationale: Weekend posting has lower expectations

**Implementation Reference:**
```typescript
// From transitionLogic.ts:67-129
const wasFridayMiss =
  status.missedDate && typeof status.missedDate.toDate === 'function'
    ? isSeoulFriday(status.missedDate.toDate())
    : false;

if (wasFridayMiss) {
  newCurrentStreak = originalStreak + 1;
} else {
  newCurrentStreak = originalStreak + 2;
}
```

#### Critical: Recovery Policy Based on Missed Date

The recovery increment depends on **which day was missed**, NOT which day recovery happens:
- Tuesday miss recovered on Wednesday = +2 (weekday policy)
- Friday miss recovered on Saturday = +1 (Friday policy)

This is validated in tests at: `functions/src/recoveryStatus/__tests__/stateTransitions.test.ts:322-424`

#### Streak Counter Semantics

**currentStreak**
- Count of consecutive working days with ≥1 post
- Updates in real-time as user posts
- Shows partial progress during recovery (REQ-008)
- Reset to 0 when transitioning onStreak → eligible

**originalStreak**
- Captured at moment of onStreak → eligible transition
- Does NOT increment during normal days
- Used to calculate restoration on successful recovery
- Cleared to 0 on recovery failure (eligible → missed)

**longestStreak**
- All-time maximum streak achieved
- Updated whenever currentStreak exceeds previous max
- Preserved across all state transitions

### 4. State Transition Logic

#### Transition 1: onStreak → eligible (Midnight Check)

**Condition:** User missed previous working day

**Process:**
1. Midnight job checks if yesterday was working day
2. Query user's postings for yesterday
3. If no posts found on working day → transition
4. Capture `originalStreak = currentStreak`
5. Reset `currentStreak = 0`
6. Calculate recovery requirements based on missed day type

**Implementation:**
- Pure logic: `transitionLogic.ts:18-61`
- Database wrapper: `transitionWrappers.ts`
- Test coverage: `stateTransitions.test.ts:29-125`

#### Transition 2: eligible → onStreak (Posting Event)

**Condition:** User completes recovery requirements before deadline

**Process:**
1. Posting triggers state check
2. Count today's posts
3. If `todayPostCount >= postsRequired`:
   - Determine recovery policy (Friday miss vs weekday miss)
   - Calculate new streak: `originalStreak + increment`
   - Update `originalStreak = newCurrentStreak`
   - Create RecoveryHistory record
   - Transition to onStreak

**Partial Progress Handling:**
- If `todayPostCount < postsRequired`:
  - Update `currentPosts = todayPostCount`
  - Update `currentStreak = todayPostCount` (shows progress)
  - Remain in eligible state

**Implementation:**
- Pure logic: `transitionLogic.ts:67-147`
- Test coverage: `stateTransitions.test.ts:128-214`

#### Transition 3: eligible → missed (Midnight Check)

**Condition:** Recovery deadline passes without meeting requirements

**Process:**
1. Midnight job checks deadline
2. If `currentTime > deadline`:
   - Preserve `currentStreak = currentPosts` (partial carry, REQ-010)
   - Clear `originalStreak = 0`
   - Transition to missed

**Implementation:**
- Pure logic: `transitionLogic.ts:153-190`
- Test coverage: `stateTransitions.test.ts:496-565`

#### Transition 4: missed → onStreak (Two Paths)

**Path 1: Same-Day Two-Post Recovery**
- First post → transition to eligible
- Second post (same day) → complete recovery → onStreak
- Fresh start: `currentStreak = 2`, `originalStreak = 2`

**Path 2: Cross-Day Building**
- Post on consecutive working days
- When `currentStreak ≥ 2` → transition to onStreak
- Gradual accumulation approach

**Implementation:**
- Pure logic: `transitionLogic.ts:196-365`
- Test coverage: `stateTransitions.test.ts:568-657`

### 5. Data Flow - End-to-End Processing

#### Posting Flow (Real-Time)

```
1. User creates post in Firestore
   ↓
2. onCreate trigger: onPostingCreated
   Path: functions/src/postings/onPostingCreated.ts
   ↓
3. Convert post timestamp to Seoul timezone
   ↓
4. Call calculatePostingTransitions(userId, seoulDate)
   Path: functions/src/recoveryStatus/transitionOrchestrators.ts:18
   ↓
5. Fetch current StreakInfo from Firestore
   ↓
6. Switch on current state:
   - eligible → calculateEligibleToOnStreak()
   - missed → calculateMissedToOnStreak()
   - onStreak → calculateOnStreakToOnStreak()
   ↓
7. Execute pure logic function:
   - Count today's posts
   - Apply business rules
   - Calculate new state
   ↓
8. Return DBUpdate object with:
   - New state values
   - Reason for transition
   - Optional RecoveryHistory
   ↓
9. Update StreakInfo in Firestore
   ↓
10. If RecoveryHistory exists:
    - Write to subcollection
    Path: users/{userId}/streakInfo/current/recoveryHistory/{id}
```

#### Midnight Flow (Scheduled)

```
1. Scheduled function triggers at 00:00 KST
   Path: functions/src/recoveryStatus/updateRecoveryStatusOnMidnightV2.ts:226
   ↓
2. Fetch all user IDs from Firestore
   ↓
3. Process in batches (100 users per batch)
   ↓
4. For each user:
   a. Call calculateMidnightTransitions(userId, currentDate)
   b. Fetch current StreakInfo
   c. Switch on current state:
      - onStreak → Check for miss (→ eligible) OR increment streak
      - eligible → Check deadline (→ missed if passed)
      - missed → Maintain state
   ↓
5. Collect all DBUpdate objects
   ↓
6. Apply updates in Firestore batches (500 per batch)
   ↓
7. Log summary:
   - Total users processed
   - Number of updates applied
   - Error count
```

#### Data Storage Structure

**StreakInfo Document:**
```
users/{userId}/streakInfo/current
{
  lastContributionDate: "2024-01-17",  // YYYY-MM-DD (KST)
  lastCalculated: Timestamp,
  status: {
    type: "onStreak" | "eligible" | "missed",
    postsRequired?: 2,      // Only for eligible
    currentPosts?: 1,       // Only for eligible
    deadline?: Timestamp,   // Only for eligible
    missedDate?: Timestamp  // Only for eligible
  },
  currentStreak: 7,
  longestStreak: 15,
  originalStreak: 5
}
```

**RecoveryHistory Subcollection:**
```
users/{userId}/streakInfo/current/recoveryHistory/{recoveryId}
{
  missedDate: Timestamp,
  recoveryDate: Timestamp,
  postsRequired: 2,
  postsWritten: 2,
  recoveredAt: Timestamp
}
```

### 6. Key Implementation Patterns

#### Pattern 1: Pure Functions for Business Logic

All core business logic is implemented as pure functions that:
- Take explicit inputs (no hidden dependencies)
- Return deterministic outputs
- Have no side effects
- Are 100% testable in isolation

**Example:**
```typescript
// Pure function signature
export function calculateOnStreakToEligiblePure(
  userId: string,
  currentDate: Date,
  streakInfo: StreakInfo | null,
  hadPostsYesterday: boolean,
): DBUpdate | null
```

Benefits:
- Easy to test (no mocks needed for business logic)
- Predictable behavior
- Safe to refactor
- Clear contracts

#### Pattern 2: Database Wrappers Delegate to Pure Functions

Database operations are isolated to wrapper functions that:
1. Fetch data from Firestore
2. Prepare inputs for pure functions
3. Call pure logic
4. Apply results to database

**Example:**
```typescript
// Wrapper function
export async function calculateOnStreakToEligible(
  userId: string,
  currentDate: Date,
): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  const yesterday = getSeoulYesterday(currentDate);
  const hadPostsYesterday = await hasSeoulDatePosts(userId, yesterday);

  return calculateOnStreakToEligiblePure(
    userId,
    currentDate,
    streakInfo,
    hadPostsYesterday
  );
}
```

#### Pattern 3: Orchestrators Use State-Based Routing

High-level orchestration uses switch statements for clean, maintainable routing:

```typescript
// From transitionOrchestrators.ts:18-43
switch (streakInfo.status.type) {
  case RecoveryStatusType.ELIGIBLE:
    return await calculateEligibleToOnStreak(userId, postDate);

  case RecoveryStatusType.MISSED:
    return await calculateMissedToOnStreak(userId, postDate);

  case RecoveryStatusType.ON_STREAK:
    return await calculateOnStreakToOnStreak(userId, postDate);
}
```

#### Pattern 4: Timezone Centralization

ALL date/timezone operations go through the centralized calendar module:
- No direct Date manipulations outside `shared/calendar.ts`
- All calculations in Asia/Seoul timezone
- Consistent date formatting (YYYY-MM-DD)
- Firebase Timestamp integration

**Key Functions:**
- `formatSeoulDate(date)` - Convert to YYYY-MM-DD string
- `isSeoulWorkingDay(date)` - Check if Mon-Fri
- `getSeoulDateBoundaries(date)` - Get start/end timestamps for queries
- `calculateRecoveryRequirement(missedDate, currentDate)` - Recovery logic

#### Pattern 5: Behavior-Focused Testing

Tests focus on **what the system does** (business outcomes) rather than **how it does it** (implementation):

```typescript
// Good: Tests behavior
describe('when user misses working day', () => {
  it('enters recovery mode requiring 2 posts by next working day', () => {
    const result = calculateOnStreakToEligiblePure(/*...*/);
    expect(result?.updates.status.postsRequired).toBe(2);
  });
});

// Avoided: Testing implementation
// expect(mockFirestore.collection).toHaveBeenCalledWith('users');
```

Test file structure:
- `stateTransitions.test.ts` - State transition logic (pure functions)
- `streakCalculations.test.ts` - Streak counting algorithms (pure functions)

## Code References

### Core State Transition Logic
- `functions/src/recoveryStatus/transitionLogic.ts:18-406` — Pure business logic for all transitions
- `functions/src/recoveryStatus/transitionOrchestrators.ts:18-103` — Orchestration layer for routing

### Streak Calculations
- `functions/src/recoveryStatus/streakCalculations.ts:60-108` — Current streak calculation algorithm
- `functions/src/recoveryStatus/streakCalculations.ts:115-166` — Longest streak calculation algorithm

### Timezone & Calendar
- `functions/src/shared/calendar.ts:186-201` — Working day determination (Seoul timezone)
- `functions/src/shared/calendar.ts:421-448` — Recovery requirement calculation
- `functions/src/shared/calendar.ts:454-461` — Deadline checking logic

### Trigger Functions
- `functions/src/postings/onPostingCreated.ts:8-64` — Real-time posting event handler
- `functions/src/recoveryStatus/updateRecoveryStatusOnMidnightV2.ts:226-243` — Scheduled midnight job

### Data Models
- `functions/src/recoveryStatus/StreakInfo.ts:1-57` — TypeScript interfaces for all data structures

### Test Coverage
- `functions/src/recoveryStatus/__tests__/stateTransitions.test.ts` — Comprehensive state transition tests
- `functions/src/recoveryStatus/__tests__/streakCalculations.test.ts` — Streak calculation algorithm tests

## Architecture Overview

### Layered Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TRIGGER LAYER                            │
│  ┌──────────────────────┐  ┌──────────────────────────┐   │
│  │ onPostingCreated     │  │ updateRecoveryStatusOn   │   │
│  │ (Firestore onCreate) │  │ MidnightV2 (Scheduled)   │   │
│  └──────────────────────┘  └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              ORCHESTRATION LAYER                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ transitionOrchestrators.ts                           │  │
│  │ - calculatePostingTransitions()                      │  │
│  │ - calculateMidnightTransitions()                     │  │
│  │ - Uses switch statements for state-based routing    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                DATABASE WRAPPER LAYER                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ transitionWrappers.ts                                │  │
│  │ - Fetch StreakInfo and posting data                  │  │
│  │ - Delegate to pure logic functions                   │  │
│  │ - Apply updates to Firestore                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              PURE BUSINESS LOGIC LAYER                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ transitionLogic.ts (PURE FUNCTIONS)                  │  │
│  │ - calculateOnStreakToEligiblePure()                  │  │
│  │ - calculateEligibleToOnStreakPure()                  │  │
│  │ - calculateEligibleToMissedPure()                    │  │
│  │ - calculateMissedToOnStreakPure()                    │  │
│  │ - No side effects, fully testable                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   UTILITY LAYER                             │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ calendar.ts    │  │ recoveryUtils. │  │ streakCalc.  │  │
│  │ (Timezone &    │  │ ts (Recovery   │  │ ts (Streak   │  │
│  │  Working Days) │  │  Helpers)      │  │  Algorithms) │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### State Transition Flow Diagram

```
                    ┌─────────────┐
                    │  onStreak   │
                    └─────────────┘
                          │ │
        Midnight: missed  │ │ Posting: continue streak
        working day       │ │ (increment counters)
                          ↓ │
                    ┌─────────────┐
                    │  eligible   │←──────┐
                    └─────────────┘       │
                          │ │              │
     Deadline passed      │ │ Posts meet   │ First post
     (partial progress)   │ │ requirement  │ after missed
                          ↓ │              │
                    ┌─────────────┐       │
                    │   missed    │───────┘
                    └─────────────┘
                          │
                          │ currentStreak ≥ 2
                          │ (cross-day building)
                          ↓
                    ┌─────────────┐
                    │  onStreak   │
                    └─────────────┘
```

### Midnight vs Posting Responsibilities

**Midnight Function Responsibilities:**
- Detect missed working days (onStreak → eligible)
- Enforce recovery deadlines (eligible → missed)
- Increment streaks for maintained onStreak status
- Process ALL users in batches

**Posting Function Responsibilities:**
- Complete recoveries (eligible → onStreak)
- Rebuild streaks (missed → onStreak)
- Track progress (eligible → eligible with updated counts)
- Real-time individual user updates

## Historical Context

The system evolved from a simpler streak model to the current 3-state recovery system. Key design decisions:

1. **Why 3 states instead of 2?**
   - Needed to distinguish "can recover" (eligible) from "must rebuild" (missed)
   - Provides clear recovery windows with explicit deadlines

2. **Why differential recovery policies (Friday +1 vs weekday +2)?**
   - Friday misses are less disruptive (weekend follows naturally)
   - Weekday misses require more effort to recover (2 posts required)

3. **Why preserve partial progress?**
   - User frustration reduction
   - Encourages continued engagement even after failed recovery

4. **Why Seoul timezone centralization?**
   - Previous bugs from inconsistent timezone handling
   - Single source of truth for all date calculations

## Related Research

- PRD Document: `functions/docs/prd/streak_recover_prd.md` — Complete requirements specification
- Test Specifications: `functions/src/recoveryStatus/__tests__/` — Behavior-driven test suite
- Calendar Implementation: `functions/src/shared/calendar.ts` — Timezone handling centralization

## Open Questions

1. **Holiday Support:** Currently weekends only. PRD mentions holidays (v2 feature) but not yet implemented in backend logic. Frontend checks holidays but backend only checks weekends.

2. **Consecutive Misses:** REQ-012 specifies behavior for consecutive misses (only most recent recoverable), but implementation details around `originalStreak` updates during consecutive misses need verification.

3. **Idempotency:** REQ-016 states "best-effort" idempotency. In production, what retry mechanisms exist for failed transitions?

4. **Performance at Scale:** Midnight job processes all users. What happens when user base grows to 10k, 100k users? Current batching (100 users) may need optimization.

5. **Recovery History Usage:** RecoveryHistory records are stored but where/how are they consumed in the frontend? Analytics? User stats?

## Architectural Strengths

1. **Pure Functional Core**
   - Business logic fully testable without mocks
   - Deterministic, predictable behavior
   - Easy to reason about and maintain

2. **Clear Separation of Concerns**
   - Logic layer (pure functions)
   - Database layer (wrappers)
   - Orchestration layer (routing)
   - Clean dependency flow

3. **Timezone Safety**
   - Single source of truth for date calculations
   - Consistent Seoul timezone usage
   - Prevents common timezone bugs

4. **Comprehensive Test Coverage**
   - Behavior-focused tests
   - Pure functions enable thorough testing
   - Edge cases well-documented in tests

5. **Scalable Architecture**
   - Batch processing for midnight job
   - Parallel user processing
   - Firestore batch writes (500 per batch)

## Potential Architectural Considerations

1. **State Machine Formalization**
   - Could benefit from explicit state machine library (XState)
   - Would make valid transitions more explicit
   - Could prevent invalid state combinations

2. **Recovery Policy Configuration**
   - Recovery rules currently hardcoded in logic
   - Could be externalized to Firestore config
   - Would enable A/B testing of recovery policies

3. **Observability Gaps**
   - Logging exists but could be more structured
   - Missing metrics for transition rates
   - No alerting on anomalous patterns

4. **Retry & Idempotency**
   - "Best-effort" approach may lead to double-counting
   - Could implement idempotency keys for posting events
   - Transaction-based updates could prevent race conditions

5. **Performance Optimization**
   - Midnight job could use Firestore queries to filter users needing updates
   - Currently processes ALL users regardless of state
   - Could optimize to only process onStreak and eligible users
