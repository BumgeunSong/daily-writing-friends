# Streak Recovery System PRD

## Overview

A simplified streak recovery system for a social writing app that allows users to recover missed writing days with flexible recovery options. The system uses a clean 3-state model and provides clear visual feedback to users.

## Core Features

### Writing Streak

- Users maintain streaks by writing at least 1 post per working day
- Working Days: Monday-Friday only (weekends don't count toward streak)
- Timezone: Fixed Asia/Seoul timezone for all users
- Real-time Updates: Streak updates immediately when user creates a post
- Fast Display: Streak count shows quickly on main page

### Recovery System

- Recovery Window: Users can recover missed working days by writing extra posts the next day
- Recovery Rules:
  - Miss working day → Write 2 posts next working day to recover
  - Miss Friday → Write 1 post on weekend to recover
- Recovery Status: Users see if they can recover and their progress

### Status Types

- **onStreak**: User is maintaining streak (no action needed)
- **eligible**: User can recover by writing X more posts today (shows progress)
- **missed**: Recovery window passed, streak broken

## Core Requirements

### Streak Rules

- Users must write at least 1 post on working days (Monday-Friday) to maintain their streak
- Weekends and holidays don't affect streak calculation
- Users get streak recovery opportunities when they miss a working day

### Recovery Policy

- **Normal Recovery**: Write 2 posts the next working day to recover a missed working day
- **Weekend Recovery**: Write 1 post on weekend to recover a missed Friday
- **Fresh Start**: Users in 'missed' status can start a new streak by writing a post

## Recovery Status Types

### Three Simple States

1. **`onStreak`**: User is maintaining their streak (no action needed)
2. **`eligible`**: User can recover by writing posts today (shows progress: X/Y posts)
3. **`missed`**: Recovery window has passed, streak is broken

### State Transitions

### Midnight Transitions (Daily at 00:00 KST)

#### onStreak → onStreak (posting on previous working day)

- **Condition**: User has posted on previous working day
- **currentStreak**: increment by 1
- **originalStreak**: increment by 1

#### onStreak → eligible (missed previous working day)

- **Condition**: User missed posting on previous working day
- **currentStreak**: becomes 0 (ready for restoration)
- **originalStreak**: remains same (preserves streak value before miss)

#### eligible → missed (recovery deadline passed)

- **Condition**: Recovery deadline has passed without completing requirements
- **currentStreak**: becomes 0
- **originalStreak**: becomes 0

#### missed → missed (no change)

- **Condition**: User remains in missed state
- **currentStreak**: becomes 0
- **originalStreak**: becomes 0

### Posting Transitions (When user creates new post)

#### missed → onStreak (fresh start)

- **Condition**: User creates post from missed state
- **currentStreak**: increment by 1 (starts from 0)
- **originalStreak**: increment by 1 (starts from 0)

#### eligible → eligible (progress update)

- **Condition**: User writes 1st post when 2 posts required
- **currentStreak**: remains 0
- **originalStreak**: remains same

#### eligible → onStreak (recovery on working day)

- **Condition**: User completes required posts (2nd post) on working day
- **currentStreak**: becomes originalStreak + 1
- **originalStreak**: increment by 1

#### eligible → onStreak (recovery on non-working day)

- **Condition**: User completes required posts (1st post) on weekend
- **currentStreak**: becomes originalStreak (no additional increment)
- **originalStreak**: remains same

#### onStreak → onStreak (maintain streak)

- **Condition**: User creates post while on streak
- **currentStreak**: increment by 1
- **originalStreak**: increment by 1

## Data Model

### StreakInfo Document

**Path**: `users/{userId}/streakInfo/{streakInfoId}`

```typescript
interface StreakInfo {
  lastContributionDate: string; // YYYY-MM-DD format
  lastCalculated: Timestamp; // When this was last calculated
  status: RecoveryStatus;
  currentStreak: number; // Current consecutive writing streak (working days)
  longestStreak: number; // All-time longest streak achieved
  originalStreak: number; // Stores the streak value before transition to eligible status
}

interface RecoveryStatus {
  type: 'onStreak' | 'eligible' | 'missed';
  postsRequired?: number; // Only for 'eligible' status
  currentPosts?: number; // Only for 'eligible' status
  deadline?: Timestamp; // Only for 'eligible' status
  missedDate?: Timestamp; // Only for 'eligible' status
}
```

### Recovery History Document

**Path**: `users/{userId}/streakInfo/{streakInfoId}/recoveryHistory/{recoveryId}`

```typescript
interface RecoveryHistory {
  missedDate: Timestamp;
  recoveryDate: Timestamp;
  postsRequired: number;
  postsWritten: number;
  recoveredAt: Timestamp;
}
```

### Helper Interface

```typescript
interface RecoveryRequirement {
  postsRequired: number;
  currentPosts: number;
  deadline: Timestamp;
  missedDate: Timestamp;
}
```

### Posting Documents

```typescript
interface Posting {
  // existing fields...
  isRecovered?: boolean; // true if this post was backdated for recovery
}
```

## Recovery Logic

### Working Day Validation

- **Working Days**: Monday-Friday in Seoul timezone (Asia/Seoul)
- **Non-Working Days**: Saturday-Sunday
- **Holiday Handling**: Korean holidays are treated as non-working days
- **State Changes**: Only previous working day misses trigger state transitions
- **Posting Impact**: Only posts on specific day types affect streak calculations

### Recovery Requirement Calculation

```typescript
function calculateRecoveryRequirement(missedDate: Date, recoveryDate: Date): RecoveryRequirement {
  const isRecoveryWorkingDay = isWorkingDay(recoveryDate);

  return {
    postsRequired: isRecoveryWorkingDay ? 2 : 1, // 2 for working day, 1 for weekend
    currentPosts: 0,
    deadline: Timestamp.fromDate(getEndOfDay(getNextWorkingDay(missedDate))),
    missedDate: Timestamp.fromDate(missedDate),
  };
}
```

### State Update Algorithm

```typescript
function updateStreakInfo(
  userId: string,
  currentDate: Date,
  isPosting: boolean = false,
): Partial<StreakInfo> {
  const streakInfo = getStreakInfo(userId);
  const isWorkingDay = isWorkingDayInSeoul(currentDate);
  const yesterday = getYesterday(currentDate);
  const wasYesterdayWorkingDay = isWorkingDayInSeoul(yesterday);

  // Midnight transitions (only check previous working day)
  if (!isPosting && wasYesterdayWorkingDay) {
    switch (streakInfo.status.type) {
      case 'onStreak':
        if (missedYesterday(userId, currentDate)) {
          return {
            status: {
              type: 'eligible',
              ...calculateRecoveryRequirement(yesterday, currentDate),
            },
            currentStreak: 0, // Reset immediately
            originalStreak: streakInfo.currentStreak, // Preserve current streak
          };
        } else {
          return {
            currentStreak: streakInfo.currentStreak + 1,
            originalStreak: streakInfo.originalStreak + 1,
          };
        }

      case 'eligible':
        if (hasDeadlinePassed(streakInfo.status.deadline, currentDate)) {
          return {
            status: { type: 'missed' },
            currentStreak: 0,
            originalStreak: 0,
          };
        }
        break;

      case 'missed':
        return {
          currentStreak: 0,
          originalStreak: 0,
        };
    }
  }

  // Posting transitions
  if (isPosting) {
    switch (streakInfo.status.type) {
      case 'missed':
        return {
          status: { type: 'onStreak' },
          currentStreak: 1, // Fresh start
          originalStreak: 1,
        };

      case 'eligible':
        const progress = getTodayPostingCount(userId, currentDate);
        if (progress >= streakInfo.status.postsRequired) {
          // Recovery completed
          const isRecoveryOnWorkingDay = isWorkingDayInSeoul(currentDate);
          return {
            status: { type: 'onStreak' },
            currentStreak: isRecoveryOnWorkingDay
              ? streakInfo.originalStreak + 1 // Working day: restore + increment
              : streakInfo.originalStreak, // Weekend: just restore
            originalStreak: isRecoveryOnWorkingDay
              ? streakInfo.originalStreak + 1
              : streakInfo.originalStreak,
          };
        } else {
          // Progress update
          return {
            status: {
              ...streakInfo.status,
              currentPosts: progress,
            },
          };
        }

      case 'onStreak':
        return {
          currentStreak: streakInfo.currentStreak + 1,
          originalStreak: streakInfo.originalStreak + 1,
        };
    }
  }
}
```

## Function Architecture

### Separation of Concerns

1. **createPosting**: Only handles basic posting record creation

   - No recovery logic
   - Uses original createdAt timestamp
   - Minimal error logging only

2. **Recovery Handler**: Separate function triggered by posting creation events

   - Listens to `users/{userId}/postings/{postingId}` creation
   - Handles recovery logic and status updates
   - Backdate posting if recovery completed
   - Add `isRecovered: true` flag when needed

3. **Midnight Function**: Daily status maintenance
   - Run at 00:00 KST
   - Create new recovery opportunities (`onStreak → eligible`)
   - Expire recovery windows (`eligible → missed`)
   - Maintain `missed` status until manual resolution

## User Interface

### Recovery Banner (SystemPostCard)

Only shown when `recoveryStatus === 'eligible'`

**Dynamic Messages:**

- Working day recovery: `"0/2 완료 - 2개 더 작성하면 streak가 복구돼요!"`
- Working day progress: `"1/2 완료 - 1개 더 작성하면 streak가 복구돼요!"`
- Weekend recovery: `"0/1 완료 - 1개 더 작성하면 streak가 복구돼요!"`

### Client Flow

1. Load StreakInfo document on BoardPage entry from `users/{userId}/streakInfo/{streakInfoId}`
2. Check `streakInfo.status.type`
3. If `'eligible'`, display recovery banner with status data (postsRequired, currentPosts, deadline)
4. Set up real-time listener for StreakInfo document updates
5. Display currentStreak value for user's streak count

## Example Scenarios

### Working Day Recovery (2 posts required)

```
Monday: 1+ posts ✅ (onStreak, currentStreak: 5, originalStreak: 5)
Tuesday: 0 posts ❌ (missed working day)
Wednesday 00:00: onStreak → eligible
  - currentStreak: 0 (reset immediately)
  - originalStreak: 5 (preserved)
  - recoveryRequirement: { postsRequired: 2, currentPosts: 0, deadline: Wed 23:59 }
Wednesday: 1st post → eligible (currentPosts: 1, currentStreak: 0)
Wednesday: 2nd post → eligible → onStreak
  - currentStreak: 6 (originalStreak + 1 for working day recovery)
  - originalStreak: 6
```

### Weekend Recovery (1 post required)

```
Thursday: 1+ posts ✅ (onStreak, currentStreak: 5, originalStreak: 5)
Friday: 0 posts ❌ (missed working day)
Saturday 00:00: onStreak → eligible
  - currentStreak: 0 (reset immediately)
  - originalStreak: 5 (preserved)
  - recoveryRequirement: { postsRequired: 1, currentPosts: 0, deadline: Mon 23:59 }
Saturday: 1 post → eligible → onStreak
  - currentStreak: 5 (restored to originalStreak, no increment for weekend)
  - originalStreak: 5 (unchanged)
```

### Recovery Failure → Fresh Start

```
Tuesday: 0 posts ❌ (onStreak, currentStreak: 5 → eligible)
Wednesday 00:00: eligible (postsRequired: 2, currentStreak: 0, originalStreak: 5)
Wednesday: 1 post → eligible (currentPosts: 1, currentStreak: 0)
Thursday 00:00: eligible → missed (deadline passed)
  - currentStreak: 0
  - originalStreak: 0
Friday: 1 post → missed → onStreak (fresh start)
  - currentStreak: 1
  - originalStreak: 1
```

### Consecutive Working Days

```
Monday: 1+ posts ✅ (onStreak, currentStreak: 5)
Monday 23:59 → Tuesday 00:00: onStreak → onStreak
  - currentStreak: 6 (increment for maintaining streak)
  - originalStreak: 6
Tuesday: 1+ posts ✅ (onStreak, currentStreak: 6)
Tuesday 23:59 → Wednesday 00:00: onStreak → onStreak
  - currentStreak: 7
  - originalStreak: 7
```

## Implementation Priority

### Phase 1: Core Logic

1. Update StreakInfo model with `originalStreak` field and Timestamp types
2. Implement `calculateRecoveryRequirement` function with Timestamp returns
3. Implement `updateStreakInfo` function for state transitions
4. Update midnight function to use StreakInfo document
5. Create separate recovery handler function for posting events
6. Implement RecoveryHistory logging for completed recoveries

### Phase 2: UI Updates

1. Update SystemPostCard component
2. Implement dynamic message generation
3. Add real-time progress display
4. Handle fresh start messaging

### Phase 3: Migration & Optimization

1. Migrate existing user data to StreakInfo documents (set `status.type: 'onStreak'`, initialize `originalStreak`)
2. Performance testing and optimization
3. Error handling improvements
4. Analytics and monitoring using RecoveryHistory collection

## Key Benefits

### Simplified Design

- Only 3 states to manage
- Clear data model with all info in `recoveryRequirement`
- Intuitive UI progress display

### Flexible Recovery

- Different requirements for working days vs weekends
- Fresh start option for missed status
- Immediate feedback on recovery completion

### Clean Architecture

- Complete separation between posting creation and recovery logic
- Real-time status updates
- Clear deadline and progress tracking

## Technical Constraints

### Backend Requirements

- **Platform**: Firebase (Firestore + Cloud Functions)
- **Performance**: Fast reads prioritized (< 100 monthly active users)
- **Testability**: Date/time logic must be easily testable
- **Extensibility**: Recovery policies should be configurable
- **Data Source**: Use existing postings collection, don't duplicate data

### Performance Considerations

- Optimize for read operations over write operations
- Minimize Firestore reads for streak display
- Cache frequently accessed data where possible
- Batch operations for midnight status updates

### Testing Requirements

- All date/time logic must be unit testable
- Mock Firebase Timestamp for consistent testing
- Test all timezone edge cases
- Validate recovery window calculations

## Configuration

### Holiday Management

- **Admin Control**: Configurable via Firebase console
- **Holiday Rules**: Holidays don't count as working days
- **Update Process**: Admin can add/remove holidays dynamically
- **Data Storage**: Store holidays in Firestore config collection

### Recovery Policy Configuration

- **Admin Settings**: Modify recovery requirements through admin interface
- **Configurable Values**:
  - Working day recovery posts required (default: 2)
  - Weekend recovery posts required (default: 1)
  - Recovery window duration (default: next working day)
- **Runtime Updates**: Changes apply to new recovery opportunities immediately

### Timezone Configuration

- **Fixed Timezone**: Asia/Seoul for all users
- **No User Customization**: Simplifies logic and testing
- **Consistent Calculation**: All date operations use KST
