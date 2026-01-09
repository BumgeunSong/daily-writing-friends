import {
  WEEKS_TO_DISPLAY,
  DAYS_PER_WEEK,
  SUNDAY,
  HasCreatedAt,
} from './types';

export function formatDateInKoreanTimezone(date: Date): string {
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

export function isDateWithinTodayInclusive(date: Date, today: Date): boolean {
  const dateStr = formatDateInKoreanTimezone(date);
  const todayStr = formatDateInKoreanTimezone(today);
  return dateStr <= todayStr;
}
