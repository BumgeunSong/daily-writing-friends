import { Timestamp } from 'firebase-admin/firestore';
import { ContributionDay, ContributionGrid } from './types';

const KST_TIMEZONE = 'Asia/Seoul';

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get Monday of the week containing the given date
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // 일요일(0) → -6, 월요일(1) → 0, ...
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Add weeks to a date
 */
export function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

/**
 * Check if date is weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Calculate posting value based on content length
 */
export function calculatePostingValue(posting: any): number {
  return posting.contentLength || 0;
}

/**
 * Calculate commenting value (always 1)
 */
export function calculateCommentingValue(comment: any): number {
  return 1; // Each comment/reply is worth 1 point
}

/**
 * Get the 4-week window range in KST
 * Returns Monday 4 weeks ago to Friday of current week
 */
export function getWindowRange(now: Date): { start: Date; end: Date } {
  // Convert to KST using Intl.DateTimeFormat
  const kstFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Get current date in KST
  const kstDateString = kstFormatter.format(now);
  const kstNow = new Date(kstDateString + 'T00:00:00');

  // Get Monday of current week
  const mondayOfCurrentWeek = getMonday(kstNow);

  // Go back 4 weeks to get start date
  const startDate = addWeeks(mondayOfCurrentWeek, -4);

  // End date should be Friday of current week
  const endDate = new Date(mondayOfCurrentWeek);
  endDate.setDate(mondayOfCurrentWeek.getDate() + 4); // Friday

  return {
    start: startDate,
    end: endDate,
  };
}

/**
 * Calculate week and column for a date within a date range
 */
export function calculateWeekAndColumn(
  activityDate: Date,
  startDate: Date,
): { week: number; column: number } {
  const week = Math.floor(
    (activityDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );

  // 월요일(1)~금요일(5): 0~4, 일요일(0)은 -1, 토요일(6)은 5
  let column = activityDate.getDay() - 1;
  if (column < 0) column = 6; // 일요일은 6으로
  if (column > 4) column = 4; // 토요일은 4로 클램프

  return {
    week: Math.max(0, Math.min(3, week)), // Clamp to 0-3
    column: Math.max(0, Math.min(4, column)), // Clamp to 0-4
  };
}

/**
 * Create a new contribution day
 */
export function createContributionDay(
  day: string,
  value: number,
  week: number,
  column: number,
): ContributionDay {
  return {
    day,
    value,
    week,
    column,
  };
}

/**
 * Create a new empty contribution grid
 */
export function createEmptyContributionGrid(date: string): ContributionGrid {
  return {
    contributions: [],
    maxValue: 0,
    lastUpdated: Timestamp.now(),
    timeRange: {
      startDate: date,
      endDate: date,
    },
  };
}

/**
 * Update or add contribution for a specific date
 */
export function updateContributionForDate(
  contributions: ContributionDay[],
  date: string,
  value: number,
): ContributionDay[] {
  const updatedContributions = [...contributions];
  let found = false;

  for (const c of updatedContributions) {
    if (c.day === date) {
      c.value += value;
      found = true;
      break;
    }
  }

  if (!found) {
    // week/column은 0으로 임시 처리 (프론트에서 다시 계산 가능)
    updatedContributions.push(createContributionDay(date, value, 0, 0));
  }

  return updatedContributions;
}

/**
 * Sort contributions by date and limit to 20 items
 */
export function sortAndLimitContributions(contributions: ContributionDay[]): ContributionDay[] {
  const sorted = [...contributions].sort((a, b) => a.day.localeCompare(b.day));

  // 20개 초과 시 오래된 것부터 삭제
  while (sorted.length > 20) {
    sorted.shift();
  }

  return sorted;
}

/**
 * Calculate max value from contributions
 */
export function calculateMaxValue(contributions: ContributionDay[]): number {
  return contributions.reduce((max, c) => Math.max(max, c.value), 0);
}

/**
 * Calculate time range from contributions
 */
export function calculateTimeRange(
  contributions: ContributionDay[],
  fallbackDate: string,
): {
  startDate: string;
  endDate: string;
} {
  if (contributions.length > 0) {
    return {
      startDate: contributions[0].day,
      endDate: contributions[contributions.length - 1].day,
    };
  } else {
    return {
      startDate: fallbackDate,
      endDate: fallbackDate,
    };
  }
}

/**
 * Update grid meta information
 */
export function updateGridMeta(
  grid: ContributionGrid,
  contributions: ContributionDay[],
  date: string,
): ContributionGrid {
  return {
    ...grid,
    contributions,
    maxValue: calculateMaxValue(contributions),
    lastUpdated: Timestamp.now(),
    timeRange: calculateTimeRange(contributions, date),
  };
}
