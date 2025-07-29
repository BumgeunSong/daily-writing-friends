import { Contribution } from '@/stats/model/WritingStats';
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils';

// Constants for grid layout
const WEEKS_TO_DISPLAY = 4;
const WEEKDAYS_COUNT = 5; // Mon-Fri only
const DAYS_PER_WEEK = 7;
const SUNDAY = 0;
const SATURDAY = 6;
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

export type ContributionData = Contribution | CommentingContribution;
export type ContributionMatrix = (number | null)[][];
export type ContributionDataMatrix = (ContributionData | null)[][];

export interface GridPosition {
  weekRow: number;
  weekdayColumn: number;
}

export interface GridResult {
  matrix: ContributionMatrix;
  weeklyContributions: ContributionDataMatrix;
  maxValue: number;
}

// Grid calculation utilities
export function createEmptyMatrices(): {
  matrix: ContributionMatrix;
  weeklyContributions: ContributionDataMatrix;
} {
  return {
    matrix: Array.from({ length: WEEKS_TO_DISPLAY }, () => Array(WEEKDAYS_COUNT).fill(null)),
    weeklyContributions: Array.from({ length: WEEKS_TO_DISPLAY }, () =>
      Array(WEEKDAYS_COUNT).fill(null),
    ),
  };
}

/**
 * Formats date as YYYY-MM-DD string in Korean timezone
 */
function formatDateInKoreanTimezone(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Gets the current date in Korean timezone using Intl.DateTimeFormat
 */
function getKoreanToday(): Date {
  const now = new Date();
  const koreaDateStr = formatDateInKoreanTimezone(now);

  // Create date at midnight Korean time
  return new Date(`${koreaDateStr}T00:00:00.000Z`);
}

export function getTimeRange(): { weeksAgo: Date; today: Date } {
  const today = getKoreanToday();

  // Find the Monday of the current week
  const todayDayOfWeek = today.getDay();
  const daysToCurrentMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1; // Sunday=0 needs 6 days back, others dayOfWeek-1
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysToCurrentMonday);
  currentMonday.setHours(0, 0, 0, 0);

  // Go back (WEEKS_TO_DISPLAY - 1) weeks from current Monday to get the start Monday
  const weeksBack = WEEKS_TO_DISPLAY - 1;
  const mondayStart = new Date(currentMonday);
  mondayStart.setDate(currentMonday.getDate() - weeksBack * DAYS_PER_WEEK);
  mondayStart.setHours(0, 0, 0, 0);

  return { weeksAgo: mondayStart, today };
}

export function filterContributionsInTimeRange<T extends { createdAt: any }>(
  contributions: T[],
  startDate: Date,
  endDate: Date,
): T[] {
  return contributions.filter((c) => {
    const contributionDate = new Date(c.createdAt);
    return contributionDate >= startDate && contributionDate <= endDate;
  });
}

export function calculateGridPosition(date: Date, weeksAgo: Date): GridPosition | null {
  const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

  // Skip weekends
  if (dayOfWeek === SUNDAY || dayOfWeek === SATURDAY) {
    return null;
  }

  // Convert to Monday=0, Tuesday=1, Wednesday=2, Thursday=3, Friday=4
  const weekdayColumn = dayOfWeek - 1;

  const daysDifference = Math.floor((date.getTime() - weeksAgo.getTime()) / MILLISECONDS_PER_DAY);
  const weekRow = Math.floor(daysDifference / DAYS_PER_WEEK);

  // Ensure within bounds
  if (
    weekRow >= 0 &&
    weekRow < WEEKS_TO_DISPLAY &&
    weekdayColumn >= 0 &&
    weekdayColumn < WEEKDAYS_COUNT
  ) {
    return { weekRow, weekdayColumn };
  }

  return null;
}

export function placeContributionInGrid(
  contribution: ContributionData,
  getValue: (contribution: ContributionData) => number,
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date,
): void {
  const date = new Date(contribution.createdAt);
  // Normalize to start of day for consistent calculations
  date.setHours(0, 0, 0, 0);

  const position = calculateGridPosition(date, weeksAgo);

  if (position) {
    const { weekRow, weekdayColumn } = position;
    const value = getValue(contribution);
    matrices.matrix[weekRow][weekdayColumn] = value;
    matrices.weeklyContributions[weekRow][weekdayColumn] = contribution;
  }
}

/**
 * Filters contributions to only include weekdays (excludes weekends)
 * This is used to calculate maxValue only from contributions that actually get placed in the grid
 */
export function filterWeekdayContributions<T extends { createdAt: any }>(contributions: T[]): T[] {
  return contributions.filter((c) => {
    const date = new Date(c.createdAt);
    const dayOfWeek = date.getDay();
    return dayOfWeek !== SUNDAY && dayOfWeek !== SATURDAY; // Exclude weekends
  });
}

/**
 * Creates a properly typed placeholder contribution for posting
 */
function createPostingPlaceholder(dateStr: string): Contribution {
  return {
    createdAt: dateStr,
    contentLength: null
  };
}

/**
 * Creates a properly typed placeholder contribution for commenting
 */
function createCommentingPlaceholder(dateStr: string): CommentingContribution {
  return {
    createdAt: dateStr,
    countOfCommentAndReplies: null
  };
}

/**
 * Pure function to initialize grid with placeholder objects for dates up to today
 */  
export function initializeGridWithPlaceholders(
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date,
  today: Date,
  contributionType: 'posting' | 'commenting',
): void {
  for (let weekRow = 0; weekRow < WEEKS_TO_DISPLAY; weekRow++) {
    for (let weekdayColumn = 0; weekdayColumn < WEEKDAYS_COUNT; weekdayColumn++) {
      const date = new Date(weeksAgo);
      date.setDate(weeksAgo.getDate() + weekRow * DAYS_PER_WEEK + weekdayColumn); // weekdayColumn 0 = Monday, 1 = Tuesday, etc.
      date.setHours(0, 0, 0, 0); // Normalize to start of day

      // Only create placeholder for dates up to today (inclusive)
      // Use Intl.DateTimeFormat for consistent timezone handling
      const dateStr = formatDateInKoreanTimezone(date);
      const todayStr = formatDateInKoreanTimezone(today);

      if (dateStr <= todayStr) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== SUNDAY && dayOfWeek !== SATURDAY) {
          const placeholder = contributionType === 'posting' 
            ? createPostingPlaceholder(dateStr)
            : createCommentingPlaceholder(dateStr);
          matrices.weeklyContributions[weekRow][weekdayColumn] = placeholder;
        }
      }
    }
  }
}

/**
 * Pure function to process contributions and place them in the grid
 */
export function processContributionsInGrid<T extends ContributionData>(
  contributions: T[],
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date,
  today: Date,
  getValue: (contribution: T) => number,
): { processedContributions: T[]; maxValue: number } {
  // Filter contributions within time range
  const recentContributions = filterContributionsInTimeRange(contributions, weeksAgo, today);

  // Place actual contributions, overwriting placeholders
  recentContributions.forEach((contribution) => {
    placeContributionInGrid(contribution, (c) => getValue(c as T), matrices, weeksAgo);
  });

  // Calculate maxValue only from contributions that actually get placed (weekdays only)
  const weekdayContributions = filterWeekdayContributions(recentContributions);
  const maxValue = Math.max(...weekdayContributions.map(getValue), 0);

  return { processedContributions: recentContributions, maxValue };
}

// Type-specific contribution processing functions
export function processPostingContributions(contributions: Contribution[]): GridResult {
  const matrices = createEmptyMatrices();
  const { weeksAgo, today } = getTimeRange();

  // Initialize grid with posting-specific placeholders
  initializeGridWithPlaceholders(matrices, weeksAgo, today, 'posting');

  // Process contributions and calculate maxValue
  const { maxValue } = processContributionsInGrid(
    contributions,
    matrices,
    weeksAgo,
    today,
    (c) => c.contentLength ?? 0,
  );

  return {
    matrix: matrices.matrix,
    weeklyContributions: matrices.weeklyContributions,
    maxValue,
  };
}

export function processCommentingContributions(
  contributions: CommentingContribution[],
): GridResult {
  const matrices = createEmptyMatrices();
  const { weeksAgo, today } = getTimeRange();

  // Initialize grid with commenting-specific placeholders
  initializeGridWithPlaceholders(matrices, weeksAgo, today, 'commenting');

  // Process contributions and calculate maxValue
  const { maxValue } = processContributionsInGrid(
    contributions,
    matrices,
    weeksAgo,
    today,
    (c) => c.countOfCommentAndReplies ?? 0,
  );

  return {
    matrix: matrices.matrix,
    weeklyContributions: matrices.weeklyContributions,
    maxValue,
  };
}

/**
 * Creates an empty grid result for when there are no contributions
 */
export function createEmptyGridResult(): GridResult {
  return {
    matrix: Array.from({ length: WEEKS_TO_DISPLAY }, () => Array(5).fill(null)),
    weeklyContributions: Array.from({ length: WEEKS_TO_DISPLAY }, () => Array(5).fill(null)),
    maxValue: 0,
  };
}

// Export constants for use in other files
export { WEEKS_TO_DISPLAY };
