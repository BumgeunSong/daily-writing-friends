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

```
onStreak → eligible : at midnight after user missed a working day
eligible → missed   : at midnight of recovery deadline without recovery
eligible → onStreak : when user writes required number of posts
missed → onStreak   : when user writes a post (starts new streak)
```

## Data Model

### User Document Extension

```typescript
interface User {
  // existing fields...
  recoveryStatus: 'onStreak' | 'eligible' | 'missed';
  recoveryRequirement?: RecoveryRequirement;  // only exists when eligible
}

interface RecoveryRequirement {
  postsRequired: number;     // How many posts needed to recover
  currentPosts: number;      // How many posts written on recovery day
  deadline: Timestamp;       // Recovery deadline
  missedDate: Timestamp;     // Date that was missed
}
```

### Posting Documents

```typescript
interface Posting {
  // existing fields...
  isRecovered?: boolean;     // true if this post was backdated for recovery
}
```

## Recovery Logic

### Recovery Requirement Calculation

```typescript
function calculateRecoveryRequirement(missedDate: Date, recoveryDate: Date): RecoveryRequirement {
  const isRecoveryWorkingDay = isWorkingDay(recoveryDate);
  
  return {
    postsRequired: isRecoveryWorkingDay ? 2 : 1,  // 2 for working day, 1 for weekend
    currentPosts: 0,
    deadline: getEndOfDay(getNextWorkingDay(missedDate)),
    missedDate: Timestamp.fromDate(missedDate)
  };
}
```

### State Update Algorithm

```typescript
function updateRecoveryStatus(userId: string, currentDate: Date) {
  const user = getUserData(userId);
  
  switch (user.recoveryStatus) {
    case 'onStreak':
      if (missedYesterday(userId, currentDate)) {
        return {
          recoveryStatus: 'eligible',
          recoveryRequirement: calculateRecoveryRequirement(yesterday, currentDate)
        };
      }
      break;
      
    case 'eligible':
      const progress = getTodayPostingCount(userId, currentDate);
      if (progress >= user.recoveryRequirement.postsRequired) {
        return { recoveryStatus: 'onStreak', recoveryRequirement: null };
      }
      if (currentDate > user.recoveryRequirement.deadline) {
        return { recoveryStatus: 'missed', recoveryRequirement: null };
      }
      // Update progress
      return { 
        recoveryStatus: 'eligible', 
        recoveryRequirement: { ...user.recoveryRequirement, currentPosts: progress }
      };
      
    case 'missed':
      const todayPosts = getTodayPostingCount(userId, currentDate);
      if (todayPosts > 0) {
        return { recoveryStatus: 'onStreak', recoveryRequirement: null };
      }
      break;
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

1. Load user document on BoardPage entry
2. Check `user.recoveryStatus`
3. If `'eligible'`, display recovery banner with `recoveryRequirement` data
4. Set up real-time listener for user document updates

## Example Scenarios

### Working Day Recovery (2 posts required)

```
Monday: 1+ posts ✅ (onStreak)
Tuesday: 0 posts ❌ (missed)
Wednesday 00:00: onStreak → eligible
  recoveryRequirement: { postsRequired: 2, currentPosts: 0, deadline: Wed 23:59 }
Wednesday: 1st post → eligible (currentPosts: 1)
Wednesday: 2nd post → eligible → onStreak (recovery complete)
```

### Weekend Recovery (1 post required)

```
Thursday: 1+ posts ✅ (onStreak)
Friday: 0 posts ❌ (missed)
Saturday 00:00: onStreak → eligible
  recoveryRequirement: { postsRequired: 1, currentPosts: 0, deadline: Mon 23:59 }
Saturday: 1 post → eligible → onStreak (recovery complete immediately)
```

### Recovery Failure → Fresh Start

```
Tuesday: 0 posts ❌ (missed)
Wednesday 00:00: onStreak → eligible (postsRequired: 2)
Wednesday: 1 post → eligible (currentPosts: 1)
Thursday 00:00: eligible → missed (recovery deadline passed)
Friday: 1 post → missed → onStreak (fresh start)
```

### Consecutive Miss → No Recovery

```
Monday: 1+ posts ✅ (onStreak)
Tuesday: 0 posts ❌ (missed)
Wednesday: 0 posts ❌ (missed again)
Thursday 00:00: onStreak → missed (skip eligible, consecutive miss)
```

## Implementation Priority

### Phase 1: Core Logic
1. Add `recoveryStatus` and `recoveryRequirement` fields to User schema
2. Implement `calculateRecoveryRequirement` function
3. Implement `updateRecoveryStatus` function
4. Update midnight function
5. Create separate recovery handler function

### Phase 2: UI Updates
1. Update SystemPostCard component
2. Implement dynamic message generation
3. Add real-time progress display
4. Handle fresh start messaging

### Phase 3: Migration & Optimization
1. Migrate existing user data (set `recoveryStatus: 'onStreak'`)
2. Performance testing and optimization
3. Error handling improvements
4. Analytics and monitoring

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