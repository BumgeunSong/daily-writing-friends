/**
 * KST Calendar Logic for Historical Context
 *
 * Implements REQ-103: KST Day Boundaries & Calendar
 * Implements REQ-105: Daily Bucketing & First-Post Rule
 *
 * This module provides calendar operations specific to historical
 * simulation, focusing on KST timezone and working day rules.
 */

import { addDays, isWeekend } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { DayBucket, PostingEvent } from './types';

const KST_TIMEZONE = 'Asia/Seoul';

/**
 * Check if a historical date string (YYYY-MM-DD) represents a working day
 * Monday-Friday are working days, Saturday-Sunday are not
 */
export function isHistoricalWorkingDay(kstDateString: string): boolean {
  if (!isValidDateString(kstDateString)) {
    throw new Error(`Invalid date string format: ${kstDateString}`);
  }

  // Create date in KST timezone to check day of week
  const date = new Date(`${kstDateString}T00:00:00+09:00`);

  // Check if it's a weekend (Saturday = 6, Sunday = 0)
  const dayOfWeek = date.getDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6; // Not Sunday and not Saturday
}

/**
 * Get KST day boundaries for a date string
 * Returns start and end of day in KST timezone
 */
export function getKstDayBoundaries(kstDateString: string): {
  start: Date;
  end: Date;
} {
  if (!isValidDateString(kstDateString)) {
    throw new Error(`Invalid date string format: ${kstDateString}`);
  }

  // Create start and end of day in KST timezone
  const startOfDayKst = fromZonedTime(`${kstDateString}T00:00:00`, KST_TIMEZONE);
  const endOfDayKst = fromZonedTime(`${kstDateString}T23:59:59.999`, KST_TIMEZONE);

  return {
    start: startOfDayKst,
    end: endOfDayKst,
  };
}

/**
 * Determine if posts in a day bucket can satisfy the daily streak requirement
 * REQ-103: Saturday posts do not satisfy streak but may count toward Friday recovery
 */
export function doesSatisfyDailyStreak(dayBucket: DayBucket): boolean {
  // Only working days can satisfy daily streak
  if (!dayBucket.isWorkingDay) {
    return false;
  }

  // Need at least one post to satisfy streak
  return dayBucket.events.length > 0;
}

/**
 * Determine if posts in a day bucket can contribute to recovery
 * REQ-103: Saturday posts may count toward Friday recovery only
 */
export function canContributeToRecovery(dayBucket: DayBucket, missedDateString: string): boolean {
  // Working day posts can always contribute to recovery
  if (dayBucket.isWorkingDay) {
    return true;
  }

  // Non-working day posts can only contribute to specific recovery scenarios
  if (isSaturdayKst(dayBucket.kstDate)) {
    // Saturday posts can only count toward Friday recovery
    const fridayDateString = getPreviousWorkingDay(dayBucket.kstDateString);
    return fridayDateString === missedDateString;
  }

  // Sunday posts never contribute to recovery
  return false;
}

/**
 * Calculate historical recovery window for a missed date
 * REQ-106: Recovery semantics for weekday vs Friday misses
 */
export function calculateHistoricalRecoveryWindow(missedDateString: string): {
  eligibleDate: string;
  postsRequired: number;
  isWorkingDayRecovery: boolean;
} {
  if (!isValidDateString(missedDateString)) {
    throw new Error(`Invalid missed date format: ${missedDateString}`);
  }

  const missedDate = new Date(`${missedDateString}T00:00:00+09:00`);
  // Determine day-of-week in KST (ISO: 1=Mon ... 5=Fri, 6=Sat, 7=Sun)
  const dayOfWeekKst = Number(formatInTimeZone(missedDate, KST_TIMEZONE, 'i'));

  if (dayOfWeekKst === 5) {
    // Friday miss → Saturday recovery with 1 post
    const saturdayDate = addDays(missedDate, 1);
    const saturdayDateString = formatInTimeZone(saturdayDate, KST_TIMEZONE, 'yyyy-MM-dd');

    return {
      eligibleDate: saturdayDateString,
      postsRequired: 1,
      isWorkingDayRecovery: false,
    };
  } else {
    // Monday-Thursday miss → next working day with 2 posts
    const nextWorkingDay = getNextWorkingDayFromDate(missedDate);
    const nextWorkingDayString = formatInTimeZone(nextWorkingDay, KST_TIMEZONE, 'yyyy-MM-dd');

    return {
      eligibleDate: nextWorkingDayString,
      postsRequired: 2,
      isWorkingDayRecovery: true,
    };
  }
}

/**
 * Get the next working day after a given date
 */
function getNextWorkingDayFromDate(date: Date): Date {
  let nextDay = addDays(date, 1);

  // Skip weekends
  while (isWeekend(nextDay)) {
    nextDay = addDays(nextDay, 1);
  }

  return nextDay;
}

/**
 * Get the previous working day before a given date string
 */
function getPreviousWorkingDay(kstDateString: string): string {
  const date = new Date(`${kstDateString}T00:00:00+09:00`);
  let previousDay = addDays(date, -1);

  // Skip weekends backwards
  while (isWeekend(previousDay)) {
    previousDay = addDays(previousDay, -1);
  }

  return formatInTimeZone(previousDay, KST_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Check if a date is a Saturday
 */
function isSaturdayKst(date: Date): boolean {
  // Determine day-of-week in KST timezone
  // ISO day-of-week: 1 (Mon) .. 7 (Sun); Saturday = 6
  return formatInTimeZone(date, KST_TIMEZONE, 'i') === '6';
}

/**
 * Validate date string format (YYYY-MM-DD)
 */
function isValidDateString(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString) && !isNaN(Date.parse(`${dateString}T00:00:00Z`));
}

/**
 * Extract the first post from a day bucket (for streak satisfaction)
 * REQ-105: First post satisfies streak, additional posts are recovery-only
 */
export function getFirstPostOfDay(dayBucket: DayBucket): PostingEvent | null {
  if (!dayBucket.events.length) {
    return null;
  }

  // Events should already be sorted by KST timestamp in groupEventsByDay
  return dayBucket.events[0];
}

/**
 * Get all posts except the first (for recovery contribution counting)
 */
export function getRecoveryOnlyPosts(dayBucket: DayBucket): PostingEvent[] {
  if (dayBucket.events.length <= 1) {
    return [];
  }

  return dayBucket.events.slice(1);
}

/**
 * Calculate total posts that can contribute to recovery from a day bucket
 */
export function countRecoveryContributingPosts(
  dayBucket: DayBucket,
  missedDateString: string,
): number {
  if (!canContributeToRecovery(dayBucket, missedDateString)) {
    return 0;
  }

  if (dayBucket.isWorkingDay) {
    // Working day: all posts count toward recovery
    return dayBucket.events.length;
  } else {
    // Non-working day (Saturday): all posts count toward Friday recovery
    return dayBucket.events.length;
  }
}

/**
 * Determine if a day bucket represents a valid recovery day for a missed date
 */
export function isValidRecoveryDay(dayBucket: DayBucket, missedDateString: string): boolean {
  const recoveryWindow = calculateHistoricalRecoveryWindow(missedDateString);
  return dayBucket.kstDateString === recoveryWindow.eligibleDate;
}
