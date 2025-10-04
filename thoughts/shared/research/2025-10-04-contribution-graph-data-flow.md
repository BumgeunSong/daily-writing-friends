---
date: 2025-10-04T12:10:14+09:00
researcher: BumgeunSong
git_commit: d5526c8e6c2f93d8f8f85985d37afa3724f8d7f3
branch: feat/holiday
repository: DailyWritingFriends
topic: "Contribution Graph Data Processing Flow"
tags: [research, codebase, stats, contribution-graph, data-flow]
status: complete
last_updated: 2025-10-04
last_updated_by: BumgeunSong
---

# Research: Contribution Graph Data Processing Flow

**Date**: 2025-10-04 12:10:14 KST
**Researcher**: BumgeunSong
**Git Commit**: d5526c8e6c2f93d8f8f85985d37afa3724f8d7f3
**Branch**: feat/holiday
**Repository**: DailyWritingFriends

## Research Question

How is the contribution graph data processed in this codebase? Specifically:
1. How is raw data fetched for contributions (posts and comments)?
2. How is the raw data transformed for the UI?
3. How does the processed data flow to UI components?
4. What is the complete data flow from backend to UI?

## Summary

The contribution graph system fetches user activity data from Firestore subcollections (`postings`, `commentings`, `replyings`), aggregates it by date into a standardized contribution format, transforms it into a 4-week x 5-weekday grid structure, and renders it as a GitHub-style activity heatmap. The system has two parallel flows: one for posting contributions and one for commenting contributions, both following the same architectural pattern but processing different data types.

## Detailed Findings

### 1. Data Fetching Layer

#### Posting Data Fetching

**Location**: `/Users/bumgeunsong/coding/tutorial/DailyWritingFriends/src/stats/api/stats.ts`

The posting data is fetched from the `users/{userId}/postings` Firestore subcollection:

```typescript
// stats.ts:63-80
export async function fetchPostingDataForContributions(
  userId: string,
  numberOfDays: number = 20
): Promise<Posting[]> {
  const workingDays = getRecentWorkingDays(numberOfDays);
  const dateRange = getDateRange(workingDays);

  const postingsRef = collection(firestore, 'users', userId, 'postings');
  const q = query(postingsRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);

  const allPostings = querySnapshot.docs.map(doc => mapDocumentToPosting(doc));

  // Filter postings to only include those within the date range
  return allPostings.filter(posting => {
    const postingDate = posting.createdAt.toDate();
    return postingDate >= dateRange.start && postingDate <= dateRange.end;
  });
}
```

**Data Structure (Firestore → Posting model)**:
- **Firestore Collection**: `users/{userId}/postings`
- **Posting Interface** (`src/post/model/Posting.ts:3-14`):
  ```typescript
  interface Posting {
    board: { id: string };
    post: { id: string; title: string; contentLength: number };
    createdAt: Timestamp;
    isRecovered?: boolean;
  }
  ```

#### Commenting Data Fetching

**Location**: `/Users/bumgeunsong/coding/tutorial/DailyWritingFriends/src/user/api/commenting.ts`

Commenting data is fetched from two subcollections:

```typescript
// commenting.ts:22-35
export async function fetchUserCommentingsByDateRange(
  userId: string,
  start: Date,
  end: Date
): Promise<Commenting[]> {
  const ref = collection(firestore, 'users', userId, 'commentings');
  const q = query(
    ref,
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<', Timestamp.fromDate(end))
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as Commenting);
}

// commenting.ts:38-51
export async function fetchUserReplyingsByDateRange(
  userId: string,
  start: Date,
  end: Date
): Promise<Replying[]> {
  const ref = collection(firestore, 'users', userId, 'replyings');
  const q = query(
    ref,
    where('createdAt', '>=', Timestamp.fromDate(start)),
    where('createdAt', '<', Timestamp.fromDate(end))
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as Replying);
}
```

**Data Structures**:
- **Commenting Interface** (`src/user/model/Commenting.ts:4-9`):
  ```typescript
  interface Commenting {
    board: { id: string };
    post: { id: string; title: string; authorId: string };
    comment: { id: string };
    createdAt: Timestamp;
  }
  ```
- **Replying Interface** (`src/user/model/Replying.ts:4-10`):
  ```typescript
  interface Replying {
    board: { id: string };
    post: { id: string; title: string; authorId: string };
    comment: { id: string; authorId: string };
    reply: { id: string };
    createdAt: Timestamp;
  }
  ```

### 2. Data Aggregation Layer

#### Posting Aggregation

**Location**: `/Users/bumgeunsong/coding/tutorial/DailyWritingFriends/src/stats/hooks/useWritingStats.ts`

```typescript
// useWritingStats.ts:101-130
function accumulatePostingLengths(postings: Posting[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const posting of postings) {
    const key = getDateKey(posting.createdAt.toDate());
    const currentSum = map.get(key) || 0;
    map.set(key, currentSum + posting.post.contentLength);
  }
  return map;
}

function toContribution(
  key: string,
  lengthMap: Map<string, number>,
  recoveredDates: Set<string>,
): Contribution {
  const contentLength = lengthMap.has(key) ? lengthMap.get(key)! : null;
  const isRecovered = recoveredDates.has(key);
  return isRecovered
    ? { createdAt: key, contentLength, isRecovered: true }
    : { createdAt: key, contentLength };
}

function createContributions(
  postings: Posting[],
  workingDays: Date[],
  recoveredDateKeys: Set<string>,
): Contribution[] {
  const lengthMap = accumulatePostingLengths(postings);
  return workingDays.map((day) => toContribution(getDateKey(day), lengthMap, recoveredDateKeys));
}
```

**Transformation**: `Posting[]` → `Map<dateKey, contentLength>` → `Contribution[]`
- Groups postings by date using `getDateKey()` (YYYY-MM-DD format)
- Sums up `contentLength` for all posts on the same day
- Creates `Contribution` objects for each working day (including days with no posts)

**Contribution Interface** (`src/stats/model/WritingStats.ts:19-23`):
```typescript
type Contribution = {
  createdAt: string; // YYYY-MM-DD
  contentLength: number | null;
  isRecovered?: boolean;
};
```

#### Commenting Aggregation

**Location**: `/Users/bumgeunsong/coding/tutorial/DailyWritingFriends/src/stats/utils/commentingContributionUtils.ts`

```typescript
// commentingContributionUtils.ts:10-33
export function aggregateCommentingContributions(
  commentings: Commenting[],
  replyings: Replying[],
  workingDays: Date[],
): CommentingContribution[] {
  const countMap = new Map<string, number>();

  for (const c of commentings) {
    const key = getDateKey(c.createdAt.toDate());
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }
  for (const r of replyings) {
    const key = getDateKey(r.createdAt.toDate());
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  return workingDays.map((day) => {
    const key = getDateKey(day);
    return {
      createdAt: key,
      countOfCommentAndReplies: countMap.get(key) ?? null,
    };
  });
}
```

**Transformation**: `Commenting[]` + `Replying[]` → `Map<dateKey, count>` → `CommentingContribution[]`
- Merges comments and replies into a single count per date
- Creates `CommentingContribution` objects for each working day

**CommentingContribution Interface** (`src/stats/utils/commentingContributionUtils.ts:5-8`):
```typescript
type CommentingContribution = {
  createdAt: string; // YYYY-MM-DD
  countOfCommentAndReplies: number | null;
};
```

### 3. Grid Processing Layer

**Location**: `/Users/bumgeunsong/coding/tutorial/DailyWritingFriends/src/stats/utils/contributionGridUtils.ts`

This is the core transformation that converts linear contribution arrays into a 2D grid structure for visualization.

#### Grid Constants and Types

```typescript
// contributionGridUtils.ts:4-25
const WEEKS_TO_DISPLAY = 4;
const WEEKDAYS_COUNT = 5; // Mon-Fri only
const DAYS_PER_WEEK = 7;

export type ContributionMatrix = (number | null)[][];
export type ContributionDataMatrix = (ContributionData | null)[][];

export interface GridResult {
  matrix: ContributionMatrix;           // 4x5 grid of numeric values
  weeklyContributions: ContributionDataMatrix; // 4x5 grid of contribution objects
  maxValue: number;                     // Max value for intensity scaling
}
```

#### Time Range Calculation

```typescript
// contributionGridUtils.ts:71-76
export function getTimeRange(): { weeksAgo: Date; today: Date } {
  const today = getKoreanToday();
  const currentMonday = findCurrentWeekMonday(today);
  const mondayStart = calculateGridStartMonday(currentMonday); // 3 weeks back
  return { weeksAgo: mondayStart, today };
}
```

This calculates the 4-week window ending at the current week's Monday.

#### Grid Position Mapping

```typescript
// contributionGridUtils.ts:110-126
export function calculateGridPosition(date: Date, weeksAgo: Date): GridPosition | null {
  const dayOfWeek = date.getDay();

  if (isWeekendDay(dayOfWeek)) {
    return null; // Weekends are excluded
  }

  const weekdayColumn = convertToWeekdayColumn(dayOfWeek); // Mon=0, Tue=1, ... Fri=4
  const daysDifference = calculateDaysDifferenceFromStart(date, weeksAgo);
  const weekRow = Math.floor(daysDifference / DAYS_PER_WEEK); // Week 0-3

  if (isPositionWithinGridBounds(weekRow, weekdayColumn)) {
    return { weekRow, weekdayColumn };
  }

  return null;
}
```

**Key Logic**: Converts date → (weekRow, weekdayColumn) position in 4x5 grid

#### Placeholder Initialization

```typescript
// contributionGridUtils.ts:203-220
export function initializeGridWithPlaceholders(
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date,
  today: Date,
  contributionType: 'posting' | 'commenting',
): void {
  for (let weekRow = 0; weekRow < WEEKS_TO_DISPLAY; weekRow++) {
    for (let weekdayColumn = 0; weekdayColumn < WEEKDAYS_COUNT; weekdayColumn++) {
      const date = calculateGridPositionDate(weeksAgo, weekRow, weekdayColumn);

      if (isDateWithinTodayInclusive(date, today)) {
        const dateStr = formatDateInKoreanTimezone(date);
        const placeholder = createPlaceholderByType(contributionType, dateStr);
        matrices.weeklyContributions[weekRow][weekdayColumn] = placeholder;
      }
    }
  }
}
```

This fills the grid with zero-value placeholders for all dates up to today, ensuring empty days still appear in the UI.

#### Processing Pipeline

```typescript
// contributionGridUtils.ts:258-276
export function processPostingContributions(contributions: Contribution[]): GridResult {
  const matrices = createEmptyMatrices();
  const { weeksAgo, today } = getTimeRange();

  initializeGridWithPlaceholders(matrices, weeksAgo, today, 'posting');
  const { maxValue } = processContributionsInGrid(
    contributions,
    matrices,
    weeksAgo,
    today,
    extractContentLengthValue, // contribution => contribution.contentLength
  );

  return {
    matrix: matrices.matrix,
    weeklyContributions: matrices.weeklyContributions,
    maxValue,
  };
}
```

**Processing Steps**:
1. Create empty 4x5 matrices
2. Calculate 4-week time range
3. Initialize with zero-value placeholders
4. Place actual contributions in grid positions
5. Calculate max value for intensity scaling
6. Return `GridResult` with both numeric matrix and data matrix

### 4. React Hooks Layer

**Location**: `/Users/bumgeunsong/coding/tutorial/DailyWritingFriends/src/stats/hooks/useContributionGrid.ts`

```typescript
// useContributionGrid.ts:34-51
export function useContributionGridData(
  contributions: (Contribution | CommentingContribution)[],
  type: ContributionType
): GridResult {
  const contributionsHash = useContributionsHash(contributions, type)

  return useMemo(() => {
    // Early return for empty contributions
    if (!contributions.length) {
      return createEmptyGridResult()
    }

    // Process contributions based on type
    return type === 'posting'
      ? processPostingContributions(contributions as Contribution[])
      : processCommentingContributions(contributions as CommentingContribution[])
  }, [type, contributionsHash])
}
```

**Memoization Strategy**: Uses a hash of contribution data to prevent unnecessary recalculations when array reference changes but content remains the same.

### 5. UI Components

#### ContributionGraph Component

**Location**: `/Users/bumgeunsong/coding/tutorial/DailyWritingFriends/src/stats/components/ContributionGraph.tsx`

```typescript
// ContributionGraph.tsx:48-77
function ContributionGraphInner(props: ContributionGraphProps) {
  const { matrix, maxValue, weeklyContributions } = useContributionGridData(
    props.contributions,
    props.type as ContributionType,
  );

  const gridContent = useMemo(() => {
    return matrix.map((row, rowIndex) => (
      <ContributionGraphWeekRow
        key={rowIndex}
        row={row}
        weeklyContributions={weeklyContributions[rowIndex]}
        maxValue={maxValue}
        rowIndex={rowIndex}
      />
    ));
  }, [matrix, weeklyContributions, maxValue]);

  return (
    <div className={cn(`w-full grid grid-rows-${WEEKS_TO_DISPLAY} grid-flow-col gap-1`)}>
      {gridContent}
    </div>
  );
}
```

**Rendering**: Creates a CSS Grid with 4 rows (weeks), rendering each cell as a `ContributionItem`.

#### ContributionItem Component

**Location**: `/Users/bumgeunsong/coding/tutorial/DailyWritingFriends/src/stats/components/ContributionItem.tsx`

```typescript
// ContributionItem.tsx:20-44
function useContributionMeta(
  contribution: CombinedContribution,
  value: number | null,
  maxValue: number,
) {
  return useMemo(() => {
    const isRecovered = isWritingContribution(contribution)
      ? Boolean(contribution.isRecovered)
      : false;

    // Calculate intensity level (0-4) based on value relative to max
    const intensity = isRecovered
      ? -1  // Special marker for recovered posts
      : !value
        ? 0   // No activity
        : Math.ceil((value / Math.max(maxValue, 1)) * 4); // Scale 1-4

    // ... date formatting ...
    return { intensity, yearMonthDay, day, isRecovered };
  }, [contribution, value, maxValue]);
}
```

**Intensity Calculation**: Maps contribution value to 5 levels (0-4) for color coding:
- `intensity = 0`: No activity (muted background)
- `intensity = 1-4`: Progressively darker green based on `value / maxValue` ratio
- `isRecovered = true`: Blue background (special case)

**Color Mapping** (`ContributionItem.tsx:47-59`):
```typescript
cn(
  'aspect-square w-full rounded-sm',
  isRecovered && 'bg-blue-400 dark:bg-blue-400/80',
  !isRecovered && intensity === 0 && 'bg-muted/50',
  !isRecovered && intensity === 1 && 'bg-green-200 dark:bg-green-800/60',
  !isRecovered && intensity === 2 && 'bg-green-400 dark:bg-green-600/70',
  !isRecovered && intensity === 3 && 'bg-green-600 dark:bg-green-500/80',
  !isRecovered && intensity === 4 && 'bg-green-800 dark:bg-green-400',
)
```

#### UserPostingStatsCard Component

**Location**: `/Users/bumgeunsong/coding/tutorial/DailyWritingFriends/src/stats/components/UserPostingStatsCard.tsx`

```typescript
// UserPostingStatsCard.tsx:12-44
export function UserPostingStatsCard({ stats, onClick }: UserPostingStatsCardProps) {
  const { user, contributions } = stats;

  return (
    <Card>
      <CardContent>
        <div className='flex flex-1 items-start gap-4'>
          <Avatar>...</Avatar>
          <div>
            <h3>{user.nickname || user.realname}</h3>
            <div className='flex flex-wrap gap-1'>
              {stats.badges.map((badge) => (
                <WritingBadgeComponent key={badge.name} badge={badge} />
              ))}
            </div>
          </div>
        </div>
        <ContributionGraph type='posting' contributions={contributions} />
      </CardContent>
    </Card>
  );
}
```

**Data Flow**: `WritingStats` → extracts `contributions` → passes to `ContributionGraph`

#### UserCommentStatsCard Component

**Location**: `/Users/bumgeunsong/coding/tutorial/DailyWritingFriends/src/stats/components/UserCommentStatsCard.tsx`

```typescript
// UserCommentStatsCard.tsx:11-40
export function UserCommentStatsCard({ stats, onClick }: UserCommentStatsCardProps) {
  const { user, contributions } = stats;

  return (
    <Card>
      <CardContent>
        <div className='flex flex-1 items-start gap-4'>
          <Avatar>...</Avatar>
          <div>
            <h3>{user.nickname || user.realname}</h3>
          </div>
        </div>
        <ContributionGraph type='commenting' contributions={contributions} />
      </CardContent>
    </Card>
  );
}
```

**Data Flow**: `UserCommentingStats` → extracts `contributions` → passes to `ContributionGraph`

## Complete Data Flow Documentation

### Posting Contributions Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. FIRESTORE DATABASE                                               │
│    Collection: users/{userId}/postings                              │
│    Documents: { board, post: {contentLength}, createdAt, ... }      │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. DATA FETCHING (stats/api/stats.ts)                              │
│    fetchPostingDataForContributions(userId, 20)                     │
│    → Query: orderBy('createdAt', 'desc')                            │
│    → Filter: dateRange (last 20 working days)                       │
│    Output: Posting[] (with Timestamp)                               │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. AGGREGATION (stats/hooks/useWritingStats.ts)                    │
│    createContributions(postings, workingDays, recoveredDates)       │
│    → accumulatePostingLengths(): Map<dateKey, totalLength>          │
│    → toContribution(): create Contribution per working day          │
│    Output: Contribution[] { createdAt: "YYYY-MM-DD",                │
│                              contentLength: number | null,          │
│                              isRecovered?: boolean }                │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. GRID PROCESSING (stats/utils/contributionGridUtils.ts)          │
│    processPostingContributions(contributions)                       │
│    → getTimeRange(): calculate 4-week window                        │
│    → initializeGridWithPlaceholders(): fill 4x5 grid with zeros     │
│    → placeContributionInGrid(): map each contribution to grid cell  │
│    → calculateMaxValue(): find max for intensity scaling            │
│    Output: GridResult {                                             │
│              matrix: (number|null)[][],      // 4x5 numeric grid    │
│              weeklyContributions: (Contribution|null)[][], // 4x5   │
│              maxValue: number                                       │
│            }                                                         │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. REACT HOOK (stats/hooks/useContributionGrid.ts)                 │
│    useContributionGridData(contributions, 'posting')                │
│    → useMemo with hash-based memoization                            │
│    → Returns GridResult (same as step 4)                            │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. UI COMPONENTS                                                    │
│    UserPostingStatsCard (receives WritingStats)                     │
│      ↓ extracts contributions                                       │
│    ContributionGraph (receives Contribution[], type='posting')      │
│      ↓ calls useContributionGridData                                │
│      ↓ renders 4x5 grid                                             │
│    ContributionGraphWeekRow (renders each week row)                 │
│      ↓                                                               │
│    ContributionItem (renders each day cell)                         │
│      ↓ calculates intensity = ceil((value/maxValue) * 4)            │
│      ↓ applies color based on intensity (0=muted, 1-4=green)        │
│      ↓ shows date tooltip                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Commenting Contributions Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. FIRESTORE DATABASE (TWO COLLECTIONS)                            │
│    Collection A: users/{userId}/commentings                         │
│    Collection B: users/{userId}/replyings                           │
│    Documents: { board, post, comment, createdAt, ... }              │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. DATA FETCHING (user/api/commenting.ts)                          │
│    fetchUserCommentingsByDateRange(userId, start, end)              │
│    fetchUserReplyingsByDateRange(userId, start, end)                │
│    → Query: where('createdAt', '>=', start)                         │
│              .where('createdAt', '<', end)                          │
│    Output: Commenting[] + Replying[] (both with Timestamp)          │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. AGGREGATION (stats/utils/commentingContributionUtils.ts)        │
│    aggregateCommentingContributions(commentings, replyings,         │
│                                      workingDays)                   │
│    → Count comments by date: Map<dateKey, count>                    │
│    → Count replies by date: Map<dateKey, count>                     │
│    → Merge counts into single map                                   │
│    → Create CommentingContribution per working day                  │
│    Output: CommentingContribution[] {                               │
│              createdAt: "YYYY-MM-DD",                               │
│              countOfCommentAndReplies: number | null                │
│            }                                                         │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. GRID PROCESSING (stats/utils/contributionGridUtils.ts)          │
│    processCommentingContributions(contributions)                    │
│    → Same grid processing as posting flow                           │
│    → Uses extractCommentAndRepliesCount() instead of                │
│      extractContentLengthValue()                                    │
│    Output: GridResult (same structure)                              │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. REACT HOOK (stats/hooks/useContributionGrid.ts)                 │
│    useContributionGridData(contributions, 'commenting')             │
│    → Same memoization logic as posting flow                         │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. UI COMPONENTS                                                    │
│    UserCommentStatsCard (receives UserCommentingStats)              │
│      ↓ extracts contributions                                       │
│    ContributionGraph (receives CommentingContribution[],            │
│                       type='commenting')                            │
│      ↓ calls useContributionGridData                                │
│      ↓ renders same 4x5 grid as posting flow                        │
│    ContributionItem (same rendering logic)                          │
│      ↓ intensity calculation uses countOfCommentAndReplies          │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Transformations and Business Logic

### 1. Date Key Normalization

**Function**: `getDateKey()` in `shared/utils/dateUtils.ts:124-133`

```typescript
export function getDateKey(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: getUserTimeZone(), // 'Asia/Seoul'
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.format(date).split('/');
  return `${parts[2]}-${parts[0]}-${parts[1]}`; // YYYY-MM-DD
}
```

**Purpose**: Converts all dates to YYYY-MM-DD format in Korean timezone, ensuring consistent grouping across the system.

### 2. Working Days Calculation

**Function**: `getRecentWorkingDays()` in `shared/utils/dateUtils.ts:10-20`

```typescript
export function getRecentWorkingDays(numberOfDays: number = 20): Date[] {
  const workingDays: Date[] = [];
  const currentDate = new Date();
  while (workingDays.length < numberOfDays) {
    if (isWorkingDay(currentDate)) {
      workingDays.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }
  return workingDays.reverse();
}
```

**Business Logic**:
- Excludes weekends (Saturday, Sunday)
- Excludes Korean holidays (hardcoded list)
- Ensures exactly `numberOfDays` working days are returned
- Returns in chronological order (oldest to newest)

### 3. Grid Position Mapping

**Function**: `calculateGridPosition()` in `contributionGridUtils.ts:110-126`

**Business Logic**:
- Weekends return `null` (not displayed)
- Monday = column 0, Friday = column 4
- Week rows are 0-3 (oldest to newest)
- Out-of-bounds dates return `null`

### 4. Intensity Scaling

**Function**: `useContributionMeta()` in `ContributionItem.tsx:20-44`

```typescript
const intensity = isRecovered
  ? -1
  : !value
    ? 0
    : Math.ceil((value / Math.max(maxValue, 1)) * 4);
```

**Business Logic**:
- Recovered posts: Special marker (-1) → blue color
- No activity: 0 → muted/gray
- Activity: 1-4 → progressively darker green
- Scaling: `ceil((value / maxValue) * 4)` ensures distribution across 4 levels
- Guards against division by zero with `Math.max(maxValue, 1)`

### 5. Placeholder Initialization

**Function**: `initializeGridWithPlaceholders()` in `contributionGridUtils.ts:203-220`

**Purpose**: Pre-fills the grid with zero-value contributions for all dates up to today. This ensures:
- Days with no activity still appear in the UI (as gray cells)
- Future dates don't appear (only dates <= today)
- Consistent grid structure even with sparse data

## Architecture Patterns

### 1. Parallel Processing Flows

The system has two completely parallel flows for posting and commenting:
- Same architectural layers (fetch → aggregate → grid → hook → UI)
- Same grid processing logic (`processContributionsInGrid()`)
- Same UI components (`ContributionGraph`, `ContributionItem`)
- Different value extractors (`contentLength` vs `countOfCommentAndReplies`)

### 2. Separation of Concerns

- **API Layer**: Pure data fetching from Firestore
- **Aggregation Layer**: Business logic for grouping by date
- **Grid Layer**: Pure transformation (date → grid position)
- **Hook Layer**: React-specific memoization
- **UI Layer**: Pure presentation

### 3. Type Safety

All layers use TypeScript interfaces:
- `Posting`, `Commenting`, `Replying` (Firestore models)
- `Contribution`, `CommentingContribution` (aggregated data)
- `GridResult`, `ContributionMatrix` (grid structure)
- `ContributionGraphProps` (UI props)

### 4. Memoization Strategy

- **`useContributionGridData`**: Memoizes expensive grid calculations
- **`useContributionsHash`**: Prevents recalculation on array reference changes
- **`ContributionGraph`**: Memoized with `React.memo()`
- **`ContributionItem`**: Memoized with `React.memo()`

## Code References

### Data Models
- `src/post/model/Posting.ts:3-14` - Posting interface
- `src/user/model/Commenting.ts:4-9` - Commenting interface
- `src/user/model/Replying.ts:4-10` - Replying interface
- `src/stats/model/WritingStats.ts:19-23` - Contribution interface
- `src/stats/utils/commentingContributionUtils.ts:5-8` - CommentingContribution interface

### Data Fetching
- `src/stats/api/stats.ts:63-80` - fetchPostingDataForContributions()
- `src/user/api/commenting.ts:22-35` - fetchUserCommentingsByDateRange()
- `src/user/api/commenting.ts:38-51` - fetchUserReplyingsByDateRange()

### Data Aggregation
- `src/stats/hooks/useWritingStats.ts:101-130` - Posting aggregation logic
- `src/stats/utils/commentingContributionUtils.ts:10-33` - Commenting aggregation logic

### Grid Processing
- `src/stats/utils/contributionGridUtils.ts:258-276` - processPostingContributions()
- `src/stats/utils/contributionGridUtils.ts:282-302` - processCommentingContributions()
- `src/stats/utils/contributionGridUtils.ts:110-126` - calculateGridPosition()
- `src/stats/utils/contributionGridUtils.ts:203-220` - initializeGridWithPlaceholders()

### React Hooks
- `src/stats/hooks/useContributionGrid.ts:34-51` - useContributionGridData()
- `src/stats/hooks/useWritingStats.ts:18-30` - useWritingStats()
- `src/stats/hooks/useCommentingStats.ts:75-84` - useCommentingStats()

### UI Components
- `src/stats/components/UserPostingStatsCard.tsx:12-44` - UserPostingStatsCard
- `src/stats/components/UserCommentStatsCard.tsx:11-40` - UserCommentStatsCard
- `src/stats/components/ContributionGraph.tsx:48-77` - ContributionGraph
- `src/stats/components/ContributionItem.tsx:74-99` - ContributionItem
- `src/stats/components/ContributionItem.tsx:20-44` - Intensity calculation logic

### Utilities
- `src/shared/utils/dateUtils.ts:10-20` - getRecentWorkingDays()
- `src/shared/utils/dateUtils.ts:124-133` - getDateKey()

## Data Structure at Each Stage

### Stage 1: Raw Firestore Data

**Posting Document**:
```typescript
{
  board: { id: "board123" },
  post: { id: "post456", title: "My Post", contentLength: 1234 },
  createdAt: Timestamp(2025-10-04 14:30:00),
  isRecovered: false
}
```

**Commenting Document**:
```typescript
{
  board: { id: "board123" },
  post: { id: "post456", title: "Some Post", authorId: "user789" },
  comment: { id: "comment101" },
  createdAt: Timestamp(2025-10-04 15:45:00)
}
```

### Stage 2: Aggregated Contributions

**Posting Contribution**:
```typescript
{
  createdAt: "2025-10-04",
  contentLength: 2500,  // Sum of all posts on this day
  isRecovered: false
}
```

**Commenting Contribution**:
```typescript
{
  createdAt: "2025-10-04",
  countOfCommentAndReplies: 5  // Total comments + replies on this day
}
```

### Stage 3: Grid Result

```typescript
{
  matrix: [
    [null, 1200, 2500, null, 1800],  // Week 1: Mon-Fri values
    [3000, null, 1500, 2200, null],  // Week 2
    [null, 1900, null, 2800, 1600],  // Week 3
    [2100, null, null, null, null]   // Week 4 (partial)
  ],
  weeklyContributions: [
    [null, {...}, {...}, null, {...}],  // Week 1: Contribution objects
    [{...}, null, {...}, {...}, null],  // Week 2
    [null, {...}, null, {...}, {...}],  // Week 3
    [{...}, null, null, null, null]     // Week 4
  ],
  maxValue: 3000  // Maximum value across all contributions
}
```

### Stage 4: UI Rendering

Each cell renders as:
```typescript
{
  day: "4",           // Day of month
  yearMonthDay: "2025. 10. 04.",
  intensity: 3,       // 0-4 based on value/maxValue
  isRecovered: false,
  backgroundColor: "bg-green-600"  // Based on intensity
}
```

## Open Questions

1. **Timezone Handling**: Currently hardcoded to 'Asia/Seoul'. How will this work for users in different timezones?
   - Reference: `dateUtils.ts:139-141` has a TODO comment about user-specific timezones

2. **Holiday Management**: The holiday list is hardcoded. How will this be maintained over time?
   - Reference: `dateUtils.ts:1-7` - Static array of Korean holidays

3. **Performance**: For users with thousands of posts/comments, does fetching all data and filtering client-side become a bottleneck?
   - Current approach: Fetch all postings, then filter by date range
   - Alternative: Use Firestore query with date range filters

4. **Real-time Updates**: How are contribution graphs updated when new posts/comments are created?
   - Current: React Query refetch intervals (5 minutes)
   - Reference: `useWritingStats.ts:27-28`, `useCommentingStats.ts:80-83`
