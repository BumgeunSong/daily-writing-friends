/**
 * Centralized Seoul timezone utilities using date-fns-tz
 *
 * This module provides type-safe, reliable Seoul timezone operations using
 * the date-fns-tz library for consistent timezone handling across different
 * server environments. All functions are pure and use the standard date-fns
 * API for timezone conversions.
 *
 * Key Design Principles:
 * 1. Use IANA timezone 'Asia/Seoul' consistently
 * 2. Always work with UTC internally, convert for display/boundaries only
 * 3. Provide clear, type-safe APIs that prevent common mistakes
 * 4. Handle DST transitions correctly (though Seoul doesn't use DST)
 * 5. Return Firebase Timestamp-compatible objects for database operations
 */

import { subDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { Timestamp } from 'firebase-admin/firestore';

export const SEOUL_TIMEZONE = 'Asia/Seoul';

/**
 * Seoul date boundaries for a given date
 * All times are in UTC for use with Firebase Timestamp comparisons
 */
export interface SeoulDateBoundaries {
  /** Start of day in Seoul (00:00:00) as UTC Date */
  startOfDay: Date;
  /** End of day in Seoul (23:59:59.999) as UTC Date */
  endOfDay: Date;
  /** The date string in YYYY-MM-DD format in Seoul timezone */
  dateString: string;
}

/**
 * Get the current time in Seoul timezone as a Date object
 * The returned Date represents the current Seoul time but as UTC
 * (i.e., if it's 15:30 in Seoul, returns Date with 15:30 UTC)
 */
export function getCurrentSeoulTime(): Date {
  const now = new Date();
  return convertToSeoulTime(now);
}

/**
 * Convert any Date to Seoul timezone
 * Returns a Date object that represents the Seoul local time as UTC
 *
 * Example:
 * - Input: 2025-07-31T06:30:00Z (UTC)
 * - Seoul time: 2025-07-31T15:30:00 (Seoul = UTC+9)
 * - Output: 2025-07-31T15:30:00Z (Seoul time represented as UTC)
 */
export function convertToSeoulTime(date: Date): Date {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided to convertToSeoulTime');
  }

  // Use date-fns-tz to properly handle timezone conversion including DST
  // This converts a Seoul local time to UTC, then we interpret it as Seoul time
  return fromZonedTime(date, SEOUL_TIMEZONE);
}

/**
 * Get date boundaries for a specific date in Seoul timezone
 * Returns UTC dates that represent the start and end of the Seoul day
 *
 * Example:
 * - Input: 2025-07-31 (any time)
 * - Returns boundaries for 2025-07-31 in Seoul timezone
 * - startOfDay: 2025-07-30T15:00:00.000Z (Seoul midnight as UTC)
 * - endOfDay: 2025-07-31T14:59:59.999Z (Seoul end of day as UTC)
 */
export function getSeoulDateBoundaries(date: Date): SeoulDateBoundaries {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided to getSeoulDateBoundaries');
  }

  // Get the date string in Seoul timezone
  const dateString = formatInTimeZone(date, SEOUL_TIMEZONE, 'yyyy-MM-dd');

  // Create Seoul date boundaries
  // Start of day: YYYY-MM-DD 00:00:00 in Seoul
  const seoulStartOfDay = new Date(`${dateString}T00:00:00.000`);
  // End of day: YYYY-MM-DD 23:59:59.999 in Seoul
  const seoulEndOfDay = new Date(`${dateString}T23:59:59.999`);

  // Convert Seoul local times to UTC for database queries
  const startOfDayUTC = fromZonedTime(seoulStartOfDay, SEOUL_TIMEZONE);
  const endOfDayUTC = fromZonedTime(seoulEndOfDay, SEOUL_TIMEZONE);

  return {
    startOfDay: startOfDayUTC,
    endOfDay: endOfDayUTC,
    dateString,
  };
}

/**
 * Get Firebase Timestamps for Seoul date boundaries
 * Convenience function that returns Timestamp objects ready for Firestore queries
 */
export function getSeoulDateBoundariesAsTimestamps(date: Date): {
  startTimestamp: Timestamp;
  endTimestamp: Timestamp;
  dateString: string;
} {
  const boundaries = getSeoulDateBoundaries(date);

  return {
    startTimestamp: Timestamp.fromDate(boundaries.startOfDay),
    endTimestamp: Timestamp.fromDate(boundaries.endOfDay),
    dateString: boundaries.dateString,
  };
}

/**
 * Format a date as YYYY-MM-DD string in Seoul timezone
 * This is the canonical way to get date strings for Seoul timezone
 */
export function formatSeoulDateString(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided to formatSeoulDateString');
  }

  return formatInTimeZone(date, SEOUL_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Check if two dates represent the same day in Seoul timezone
 */
export function isSameDateInSeoul(date1: Date, date2: Date): boolean {
  const dateString1 = formatSeoulDateString(date1);
  const dateString2 = formatSeoulDateString(date2);
  return dateString1 === dateString2;
}

/**
 * Get yesterday's date boundaries in Seoul timezone
 * Convenience function for common use case
 */
export function getYesterdaySeoulBoundaries(): SeoulDateBoundaries {
  const now = new Date();
  const yesterday = subDays(now, 1);
  return getSeoulDateBoundaries(yesterday);
}

/**
 * Get today's date boundaries in Seoul timezone
 * Convenience function for common use case
 */
export function getTodaySeoulBoundaries(): SeoulDateBoundaries {
  const now = new Date();
  return getSeoulDateBoundaries(now);
}

/**
 * Parse a YYYY-MM-DD date string and get Seoul timezone boundaries
 * Useful when working with date strings from the database
 */
export function parseSeoulDateString(dateString: string): SeoulDateBoundaries {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error(`Invalid date string format. Expected YYYY-MM-DD, got: ${dateString}`);
  }

  // Create a date representing noon on that day in Seoul to avoid timezone edge cases
  const seoulNoon = new Date(`${dateString}T12:00:00`);
  const utcNoonForSeoulDate = fromZonedTime(seoulNoon, SEOUL_TIMEZONE);

  return getSeoulDateBoundaries(utcNoonForSeoulDate);
}

/**
 * Debug utility to show timezone conversion details
 * Useful for troubleshooting timezone issues
 */
export function debugTimezoneConversion(date: Date): {
  original: string;
  utc: string;
  seoul: string;
  boundaries: SeoulDateBoundaries;
} {
  const seoulTime = convertToSeoulTime(date);
  const boundaries = getSeoulDateBoundaries(date);

  return {
    original: date.toISOString(),
    utc: date.toISOString(),
    seoul: seoulTime.toISOString(),
    boundaries: {
      ...boundaries,
      startOfDay: new Date(boundaries.startOfDay),
      endOfDay: new Date(boundaries.endOfDay),
    },
  };
}
