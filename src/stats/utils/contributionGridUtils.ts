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

function formatDateInKoreanTimezone(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getKoreanToday(): Date {
  const now = new Date();
  const koreaDateStr = formatDateInKoreanTimezone(now);
  return new Date(koreaDateStr);
}

function findCurrentWeekMonday(today: Date): Date {
  const todayDayOfWeek = today.getDay();
  const daysToCurrentMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() - daysToCurrentMonday);
  currentMonday.setHours(0, 0, 0, 0);
  return currentMonday;
}

function calculateGridStartMonday(currentMonday: Date): Date {
  const weeksBack = WEEKS_TO_DISPLAY - 1;
  const mondayStart = new Date(currentMonday);
  mondayStart.setDate(currentMonday.getDate() - weeksBack * DAYS_PER_WEEK);
  mondayStart.setHours(0, 0, 0, 0);
  return mondayStart;
}

export function getTimeRange(): { weeksAgo: Date; today: Date } {
  const today = getKoreanToday();
  const currentMonday = findCurrentWeekMonday(today);
  const mondayStart = calculateGridStartMonday(currentMonday);
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

function isWeekendDay(dayOfWeek: number): boolean {
  return dayOfWeek === SUNDAY || dayOfWeek === SATURDAY;
}

function convertToWeekdayColumn(dayOfWeek: number): number {
  return dayOfWeek - 1;
}

function calculateDaysDifferenceFromStart(date: Date, startDate: Date): number {
  return Math.floor((date.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY);
}

function isPositionWithinGridBounds(weekRow: number, weekdayColumn: number): boolean {
  return (
    weekRow >= 0 &&
    weekRow < WEEKS_TO_DISPLAY &&
    weekdayColumn >= 0 &&
    weekdayColumn < WEEKDAYS_COUNT
  );
}

export function calculateGridPosition(date: Date, weeksAgo: Date): GridPosition | null {
  const dayOfWeek = date.getDay();

  if (isWeekendDay(dayOfWeek)) {
    return null;
  }

  const weekdayColumn = convertToWeekdayColumn(dayOfWeek);
  const daysDifference = calculateDaysDifferenceFromStart(date, weeksAgo);
  const weekRow = Math.floor(daysDifference / DAYS_PER_WEEK);

  if (isPositionWithinGridBounds(weekRow, weekdayColumn)) {
    return { weekRow, weekdayColumn };
  }

  return null;
}

function normalizeToMidnight(date: Date): void {
  date.setHours(0, 0, 0, 0);
}

function updateMatricesAtPosition(
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  position: GridPosition,
  contribution: ContributionData,
  value: number
): void {
  const { weekRow, weekdayColumn } = position;
  matrices.matrix[weekRow][weekdayColumn] = value;
  matrices.weeklyContributions[weekRow][weekdayColumn] = contribution;
}

export function placeContributionInGrid(
  contribution: ContributionData,
  getValue: (contribution: ContributionData) => number,
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date,
): void {
  const date = new Date(contribution.createdAt);
  normalizeToMidnight(date);

  const position = calculateGridPosition(date, weeksAgo);

  if (position) {
    const value = getValue(contribution);
    updateMatricesAtPosition(matrices, position, contribution, value);
  }
}

function isWeekdayContribution<T extends { createdAt: any }>(contribution: T): boolean {
  const date = new Date(contribution.createdAt);
  const dayOfWeek = date.getDay();
  return !isWeekendDay(dayOfWeek);
}

export function filterWeekdayContributions<T extends { createdAt: any }>(contributions: T[]): T[] {
  return contributions.filter(isWeekdayContribution);
}

function createPostingPlaceholderWithZeroContent(dateStr: string): Contribution {
  return {
    createdAt: dateStr,
    contentLength: 0
  };
}

function createCommentingPlaceholderWithZeroCount(dateStr: string): CommentingContribution {
  return {
    createdAt: dateStr,
    countOfCommentAndReplies: 0
  };
}

function calculateGridPositionDate(weeksAgo: Date, weekRow: number, weekdayColumn: number): Date {
  const date = new Date(weeksAgo);
  date.setDate(weeksAgo.getDate() + weekRow * DAYS_PER_WEEK + weekdayColumn);
  normalizeToMidnight(date);
  return date;
}

function isDateWithinTodayInclusive(date: Date, today: Date): boolean {
  const dateStr = formatDateInKoreanTimezone(date);
  const todayStr = formatDateInKoreanTimezone(today);
  return dateStr <= todayStr;
}

function createPlaceholderByType(contributionType: 'posting' | 'commenting', dateStr: string): ContributionData {
  return contributionType === 'posting' 
    ? createPostingPlaceholderWithZeroContent(dateStr)
    : createCommentingPlaceholderWithZeroCount(dateStr);
}

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

function placeAllContributionsInGrid<T extends ContributionData>(
  contributions: T[],
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date,
  getValue: (contribution: T) => number
): void {
  contributions.forEach((contribution) => {
    placeContributionInGrid(contribution, (c) => getValue(c as T), matrices, weeksAgo);
  });
}

function calculateMaxValueFromWeekdayContributions<T extends ContributionData>(
  contributions: T[],
  getValue: (contribution: T) => number
): number {
  const weekdayContributions = filterWeekdayContributions(contributions);
  return Math.max(...weekdayContributions.map(getValue), 0);
}

export function processContributionsInGrid<T extends ContributionData>(
  contributions: T[],
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date,
  today: Date,
  getValue: (contribution: T) => number,
): { processedContributions: T[]; maxValue: number } {
  const recentContributions = filterContributionsInTimeRange(contributions, weeksAgo, today);
  placeAllContributionsInGrid(recentContributions, matrices, weeksAgo, getValue);
  const maxValue = calculateMaxValueFromWeekdayContributions(recentContributions, getValue);
  return { processedContributions: recentContributions, maxValue };
}

function extractContentLengthValue(contribution: Contribution): number {
  return contribution.contentLength ?? 0;
}

export function processPostingContributions(contributions: Contribution[]): GridResult {
  const matrices = createEmptyMatrices();
  const { weeksAgo, today } = getTimeRange();

  initializeGridWithPlaceholders(matrices, weeksAgo, today, 'posting');
  const { maxValue } = processContributionsInGrid(
    contributions,
    matrices,
    weeksAgo,
    today,
    extractContentLengthValue,
  );

  return {
    matrix: matrices.matrix,
    weeklyContributions: matrices.weeklyContributions,
    maxValue,
  };
}

function extractCommentAndRepliesCount(contribution: CommentingContribution): number {
  return contribution.countOfCommentAndReplies ?? 0;
}

export function processCommentingContributions(
  contributions: CommentingContribution[],
): GridResult {
  const matrices = createEmptyMatrices();
  const { weeksAgo, today } = getTimeRange();

  initializeGridWithPlaceholders(matrices, weeksAgo, today, 'commenting');
  const { maxValue } = processContributionsInGrid(
    contributions,
    matrices,
    weeksAgo,
    today,
    extractCommentAndRepliesCount,
  );

  return {
    matrix: matrices.matrix,
    weeklyContributions: matrices.weeklyContributions,
    maxValue,
  };
}

export function createEmptyGridResult(): GridResult {
  return {
    matrix: Array.from({ length: WEEKS_TO_DISPLAY }, () => Array(5).fill(null)),
    weeklyContributions: Array.from({ length: WEEKS_TO_DISPLAY }, () => Array(5).fill(null)),
    maxValue: 0,
  };
}

// Export constants for use in other files
export { WEEKS_TO_DISPLAY };
