import { Contribution } from '@/stats/model/WritingStats';
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils';
import { isConfigurableHoliday } from '@/shared/utils/dateUtils';

const WEEKS_TO_DISPLAY = 4;
const WEEKDAYS_COUNT = 5;
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

type DateLike = string | Date;

interface HasCreatedAt {
  createdAt: DateLike;
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

function calculateDaysToMonday(dayOfWeek: number): number {
  return dayOfWeek === SUNDAY ? 6 : dayOfWeek - 1;
}

function findCurrentWeekMonday(today: Date): Date {
  const todayDayOfWeek = today.getDay();
  const daysToCurrentMonday = calculateDaysToMonday(todayDayOfWeek);
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

/**
 * 그리드 표시를 위한 시간 범위를 계산합니다.
 * @param today 기준 날짜 (테스트용, 기본값: 현재 한국 날짜)
 * @returns 시작일(weeksAgo)과 오늘(today) 객체
 */
export function getTimeRange(today?: Date): { weeksAgo: Date; today: Date } {
  const effectiveToday = today ?? getKoreanToday();
  const currentMonday = findCurrentWeekMonday(effectiveToday);
  const mondayStart = calculateGridStartMonday(currentMonday);
  return { weeksAgo: mondayStart, today: effectiveToday };
}

function isContributionInDateRange<T extends HasCreatedAt>(
  contribution: T,
  startDate: Date,
  endDate: Date,
): boolean {
  const contributionDate = new Date(contribution.createdAt);
  return contributionDate >= startDate && contributionDate <= endDate;
}

export function filterContributionsInTimeRange<T extends HasCreatedAt>(
  contributions: T[],
  startDate: Date,
  endDate: Date,
): T[] {
  return contributions.filter((c) => isContributionInDateRange(c, startDate, endDate));
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

function calculateWeekRow(daysDifference: number): number {
  return Math.floor(daysDifference / DAYS_PER_WEEK);
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
  const weekRow = calculateWeekRow(daysDifference);

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
  value: number,
): void {
  const { weekRow, weekdayColumn } = position;
  const existingContribution = matrices.weeklyContributions[weekRow][weekdayColumn];

  // Preserve isHoliday and holidayName from placeholder when placing real contribution
  const mergedContribution = {
    ...contribution,
    isHoliday: existingContribution?.isHoliday ?? contribution.isHoliday,
    holidayName: existingContribution?.holidayName ?? contribution.holidayName,
  };

  matrices.matrix[weekRow][weekdayColumn] = value;
  matrices.weeklyContributions[weekRow][weekdayColumn] = mergedContribution;
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

function isWeekdayContribution<T extends HasCreatedAt>(contribution: T): boolean {
  const date = new Date(contribution.createdAt);
  const dayOfWeek = date.getDay();
  return !isWeekendDay(dayOfWeek);
}

export function filterWeekdayContributions<T extends HasCreatedAt>(contributions: T[]): T[] {
  return contributions.filter(isWeekdayContribution);
}

function createPostingPlaceholderWithZeroContent(
  dateStr: string,
  isHoliday = false,
  holidayName?: string,
): Contribution {
  return {
    createdAt: dateStr,
    contentLength: 0,
    isHoliday,
    holidayName,
  };
}

function createCommentingPlaceholderWithZeroCount(
  dateStr: string,
  isHoliday = false,
  holidayName?: string,
): CommentingContribution {
  return {
    createdAt: dateStr,
    countOfCommentAndReplies: 0,
    isHoliday,
    holidayName,
  };
}

function calculateGridPositionDate(weeksAgo: Date, weekRow: number, weekdayColumn: number): Date {
  const date = new Date(weeksAgo);
  const offsetDays = weekRow * DAYS_PER_WEEK + weekdayColumn;
  date.setDate(weeksAgo.getDate() + offsetDays);
  normalizeToMidnight(date);
  return date;
}

function isDateWithinTodayInclusive(date: Date, today: Date): boolean {
  const dateStr = formatDateInKoreanTimezone(date);
  const todayStr = formatDateInKoreanTimezone(today);
  return dateStr <= todayStr;
}

function createPlaceholderByType(
  contributionType: 'posting' | 'commenting',
  dateStr: string,
  isHoliday = false,
  holidayName?: string,
): ContributionData {
  return contributionType === 'posting'
    ? createPostingPlaceholderWithZeroContent(dateStr, isHoliday, holidayName)
    : createCommentingPlaceholderWithZeroCount(dateStr, isHoliday, holidayName);
}

function shouldInitializePlaceholder(date: Date, today: Date): boolean {
  return isDateWithinTodayInclusive(date, today);
}

function initializeSinglePlaceholder(
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  date: Date,
  weekRow: number,
  weekdayColumn: number,
  contributionType: 'posting' | 'commenting',
  configurableHolidays?: Map<string, string>,
): void {
  const dateStr = formatDateInKoreanTimezone(date);
  const isHoliday = isConfigurableHoliday(date, configurableHolidays);
  const holidayName = isHoliday ? configurableHolidays?.get(dateStr) : undefined;
  const placeholder = createPlaceholderByType(contributionType, dateStr, isHoliday, holidayName);

  matrices.weeklyContributions[weekRow][weekdayColumn] = placeholder;
}

export function initializeGridWithPlaceholders(
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date,
  today: Date,
  contributionType: 'posting' | 'commenting',
  configurableHolidays?: Map<string, string>,
): void {
  for (let weekRow = 0; weekRow < WEEKS_TO_DISPLAY; weekRow++) {
    for (let weekdayColumn = 0; weekdayColumn < WEEKDAYS_COUNT; weekdayColumn++) {
      const date = calculateGridPositionDate(weeksAgo, weekRow, weekdayColumn);

      if (shouldInitializePlaceholder(date, today)) {
        initializeSinglePlaceholder(
          matrices,
          date,
          weekRow,
          weekdayColumn,
          contributionType,
          configurableHolidays,
        );
      }
    }
  }
}

function placeAllContributionsInGrid<T extends ContributionData>(
  contributions: T[],
  matrices: { matrix: ContributionMatrix; weeklyContributions: ContributionDataMatrix },
  weeksAgo: Date,
  getValue: (contribution: T) => number,
): void {
  contributions.forEach((contribution) => {
    placeContributionInGrid(contribution, (c) => getValue(c as T), matrices, weeksAgo);
  });
}

function calculateMaxValueFromWeekdayContributions<T extends ContributionData>(
  contributions: T[],
  getValue: (contribution: T) => number,
): number {
  const weekdayContributions = filterWeekdayContributions(contributions);
  const values = weekdayContributions.map(getValue);
  return Math.max(...values, 0);
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

/**
 * 글쓰기 기여도를 그리드 데이터로 처리합니다.
 * @param contributions 기여도 데이터 배열
 * @param configurableHolidays 설정 가능한 휴일 맵
 * @param timeRange 시간 범위 (테스트용, 기본값: getTimeRange())
 * @returns 그리드 결과 (matrix, weeklyContributions, maxValue)
 */
export function processPostingContributions(
  contributions: Contribution[],
  configurableHolidays?: Map<string, string>,
  timeRange?: { weeksAgo: Date; today: Date },
): GridResult {
  const matrices = createEmptyMatrices();
  const { weeksAgo, today } = timeRange ?? getTimeRange();

  initializeGridWithPlaceholders(matrices, weeksAgo, today, 'posting', configurableHolidays);
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

/**
 * 댓글/답글 기여도를 그리드 데이터로 처리합니다.
 * @param contributions 기여도 데이터 배열
 * @param configurableHolidays 설정 가능한 휴일 맵
 * @param timeRange 시간 범위 (테스트용, 기본값: getTimeRange())
 * @returns 그리드 결과 (matrix, weeklyContributions, maxValue)
 */
export function processCommentingContributions(
  contributions: CommentingContribution[],
  configurableHolidays?: Map<string, string>,
  timeRange?: { weeksAgo: Date; today: Date },
): GridResult {
  const matrices = createEmptyMatrices();
  const { weeksAgo, today } = timeRange ?? getTimeRange();

  initializeGridWithPlaceholders(matrices, weeksAgo, today, 'commenting', configurableHolidays);
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

export { WEEKS_TO_DISPLAY };
