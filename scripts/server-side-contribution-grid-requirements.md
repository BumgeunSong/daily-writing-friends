# Server-Side Contribution Grid Requirements

## Overview
Move contribution grid calculation from client to Firebase Cloud Functions to eliminate timezone bugs and improve performance. This system will pre-calculate GitHub-style contribution grids and store them in Firestore for direct client consumption.

## Problem Statement
Currently, contribution grids are calculated on the client side, leading to:
- **Timezone conversion bugs**: Late-night UTC postings get categorized as next day in KST
- **Performance issues**: Complex calculations on every render
- **Inconsistent logic**: Calendar logic duplicated between frontend and backend
- **Data mismatch**: Different users see different results due to client-side processing

## Solution Architecture

### 1. Data Structure

#### New Firestore Collection: `contributionGrids`
```
users/{userId}/contributionGrids/postingGrid
users/{userId}/contributionGrids/commentingGrid
```

#### Document Schema
```typescript
interface ContributionGrid {
  contributions: ContributionDay[], // Flat list of daily contributions with grid positions
  maxValue: number,                 // Maximum value across all days
  lastUpdated: Timestamp,
  timeRange: {
    startDate: string,              // "YYYY-MM-DD" (Monday 4 weeks ago)
    endDate: string                 // "YYYY-MM-DD" (today)
  }
}

interface ContributionDay {
  day: string,                      // "YYYY-MM-DD" (server-calculated in KST)
  value: number,                    // Activity count/content length for this day
  week: number,                     // 0-3 (which week in the 4-week grid)
  column: number,                   // 0-4 (Mon=0, Tue=1, Wed=2, Thu=3, Fri=4)
}
```

### 2. Backend Functions

#### Real-time Update Functions
- **`updatePostingContributionGrid`**: Triggered on `users/{userId}/postings/{postingId}` creation
- **`updateCommentingContributionGrid`**: Triggered on `users/{userId}/commentings/{commentingId}` creation

#### Midnight Scheduler Function
- **`updateContributionGridsOnMidnight`**: Runs daily at 00:00 KST
- Updates all users' grids to shift the 4-week window

#### Core Logic Functions
- **`updateContributionGridRealtime`**: Updates specific grid cell for new activity
- **`rebuildContributionGrid`**: Rebuilds entire grid from source data
- **`buildGridFromActivities`**: Constructs grid matrix from activity data

### 3. Grid Calculation Logic

#### Time Window
- **Duration**: 4 weeks (28 calendar days)
- **Start**: Monday of the week that was 4 weeks ago
- **End**: Current date (today)
- **Timezone**: All calculations in Korea Standard Time (KST)

#### Grid Structure
- **Dimensions**: 4 weeks × 5 weekdays = 4×5 matrix
- **Days included**: Monday through Friday only
- **Weekend handling**: Excluded from grid display

#### Value Calculation
- **Posting Grid**: Sum of `post.contentLength` per day
- **Commenting Grid**: Count of comments/replies per day (1 point each)
- **Aggregation**: Multiple activities on same day are summed

#### Grid Position Calculation (Server-Side)
```typescript
function calculateGridPosition(activityDate: Date, windowStartDate: Date): { week: number, column: number } {
  // Convert to Seoul timezone and normalize to start of day
  const seoulDate = toSeoulDate(activityDate);
  const windowStart = toSeoulDate(windowStartDate);
  
  // Calculate days difference
  const daysDiff = Math.floor((seoulDate.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate week (0-3)
  const week = Math.floor(daysDiff / 7);
  
  // Calculate column based on day of week (Monday=0, Tuesday=1, ..., Friday=4)
  const dayOfWeek = seoulDate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const column = dayOfWeek - 1; // Convert to 0-4 range
  
  // Only include weekdays (Monday-Friday)
  if (column < 0 || column > 4) {
    return null; // Weekend, exclude from grid
  }
  
  return { week, column };
}
```

### 4. Update Triggers

#### Real-time Updates (Immediate)
- User creates a post → Update `postingGrid`
- User creates a comment → Update `commentingGrid`
- User creates a reply → Update `commentingGrid`

#### Midnight Updates (Daily at 00:00 KST)
- Shift time window forward by 1 day
- Rebuild all grids from source data
- Process all users in batches (100 users per batch)

### 5. Client Integration

#### New Hook: `useContributionGrid`
```typescript
export function useContributionGrid(userId: string, type: 'posting' | 'commenting') {
  const gridType = type === 'posting' ? 'postingGrid' : 'commentingGrid';
  return useDocument(`users/${userId}/contributionGrids/${gridType}`);
}
```

#### Client Grid Rendering (Calendar-Agnostic)
```typescript
function renderContributionGrid(contributionGrid: ContributionGrid) {
  // Initialize empty 4x5 matrix
  const matrix: (number | null)[][] = Array(4).fill(null).map(() => Array(5).fill(null));
  const contributionMatrix: (ContributionDay | null)[][] = Array(4).fill(null).map(() => Array(5).fill(null));
  
  // Simply place each contribution at its pre-calculated position
  contributionGrid.contributions.forEach(contrib => {
    if (contrib.week >= 0 && contrib.week < 4 && contrib.column >= 0 && contrib.column < 5) {
      matrix[contrib.week][contrib.column] = contrib.value;
      contributionMatrix[contrib.week][contrib.column] = contrib;
    }
  });
  
  return { matrix, contributionMatrix, maxValue: contributionGrid.maxValue };
}
```

#### Example Data Structure
```typescript
// Server provides complete grid positioning
{
  contributions: [
    { day: "2025-06-30", value: 1233, week: 0, column: 0 }, // Monday, Week 1
    { day: "2025-07-01", value: 472,  week: 0, column: 1 }, // Tuesday, Week 1
    { day: "2025-07-02", value: 1179, week: 0, column: 2 }, // Wednesday, Week 1
    // Today is 2025-07-05 (Saturday) - only shows Mon-Wed, Thu-Fri are empty (future)
  ],
  maxValue: 1233,
  timeRange: { startDate: "2025-06-30", endDate: "2025-07-05" }
}
```

#### Updated Component Props
```typescript
export type ContributionGraphProps = {
  userId: string;
  type: 'posting' | 'commenting';
  className?: string;
};
```

### 6. Performance Optimizations

#### Batch Processing
- Process users in batches of 100 during midnight updates
- Use Firestore batch writes (500 operations per batch)
- Parallel processing with `Promise.allSettled`

#### Smart Updates
- Real-time updates only if activity falls within current 4-week window
- Rebuild grid only when necessary (midnight or missing data)
- Cache frequently accessed data

#### Error Handling
- Continue processing other users if individual updates fail
- Log errors for debugging without breaking entire batch
- Self-healing: rebuild grid from source data on errors

### 7. Migration Strategy

#### Phase 1: Deploy Functions
- Deploy new cloud functions alongside existing client logic
- No client changes yet
- Test with subset of users

#### Phase 2: Backfill Data
- Run one-time script to create initial grids for all users
- Verify data consistency between old and new systems

#### Phase 3: Client Migration
- Update components to use new `useContributionGrid` hook
- Remove old contribution calculation logic
- A/B test to ensure consistency

#### Phase 4: Cleanup
- Remove deprecated client-side calculation functions
- Remove unused imports and dependencies
- Update documentation

### 8. File Structure

```
functions/src/contributionGrids/
├── index.ts                        # Export all functions
├── updateContributionGrids.ts      # Real-time update triggers
├── midnightGridUpdater.ts          # Midnight scheduler
├── userGridUpdater.ts              # Individual user updates
├── gridBuilder.ts                  # Grid construction logic
├── realtimeUpdater.ts              # Real-time update logic
└── types.ts                        # TypeScript interfaces

src/stats/
├── hooks/
│   └── useContributionGrid.ts      # New client hook
└── components/
    └── ContributionGraph.tsx       # Updated component
```

### 9. Testing Requirements

#### Unit Tests
- Grid calculation logic with various timezone scenarios
- Batch processing with error conditions
- Matrix construction from activity data

#### Integration Tests
- End-to-end flow from posting creation to grid update
- Midnight update with real user data
- Client component rendering with new data structure

#### Performance Tests
- Large user base midnight updates (10,000+ users)
- Concurrent real-time updates
- Memory usage during batch processing

### 10. Monitoring & Observability

#### Metrics to Track
- Midnight update completion time
- Error rates per user batch
- Grid update latency for real-time triggers
- Client fetch performance

#### Logging Strategy
- Detailed logs for midnight batch processing
- Error tracking with user context
- Performance metrics for optimization

### 11. Benefits

#### Eliminated Issues
- ✅ No more timezone conversion bugs
- ✅ No client-side date calculation complexity
- ✅ Consistent results across all users
- ✅ Improved performance with pre-calculated data

#### New Capabilities
- ✅ Real-time grid updates via Firestore listeners
- ✅ Scalable to large user bases
- ✅ Easy to maintain and debug
- ✅ Centralized calendar logic
- ✅ **Calendar-agnostic frontend**: No date calculations on client
- ✅ **Perfect grid alignment**: Server pre-calculates exact positions
- ✅ **Future-proof**: Empty cells automatically shown for upcoming days

### 12. Acceptance Criteria

#### Functional Requirements
- [ ] Grids update immediately when users post/comment
- [ ] Grids shift time window daily at midnight KST
- [ ] All dates calculated consistently in Seoul timezone
- [ ] Support both posting and commenting activity types
- [ ] Handle edge cases (no data, first-time users, etc.)

#### Performance Requirements
- [ ] Real-time updates complete within 5 seconds
- [ ] Midnight updates complete within 30 minutes for 10K users
- [ ] Client grid rendering with <100ms load time
- [ ] Error rate <1% for all operations

#### Quality Requirements
- [ ] Comprehensive test coverage >90%
- [ ] Clear error messages and logging
- [ ] Graceful degradation on failures
- [ ] Backward compatibility during migration