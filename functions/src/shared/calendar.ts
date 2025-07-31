/**
 * Centralized Calendar Module
 *
 * This module consolidates ALL calendar-dependent logic to prevent timezone and
 * date calculation bugs. No other module should directly manipulate dates or
 * perform calendar calculations - everything must go through this layer.
 *
 * Key Responsibilities:
 * 1. Working day calculations (Seoul timezone)
 * 2. Date arithmetic and comparisons
 * 3. Recovery deadline calculations
 * 4. Posting date queries
 * 5. Streak date calculations
 *
 * Design Principles:
 * - All operations use Seoul timezone
 * - Immutable date operations (no mutation)
 * - Type-safe APIs with clear contracts
 * - Firebase Timestamp integration
 * - Comprehensive error handling
 */

import admin from './admin';
import { isWorkingDay } from './dateUtils';
import {
  getSeoulDateBoundariesAsTimestamps,
  formatSeoulDateString,
  convertToSeoulTime,
  isSameDateInSeoul,
  parseSeoulDateString,
} from './seoulTime';

// ===== WORKING DAY OPERATIONS =====

/**
 * Check if a date is a working day in Seoul timezone
 * Centralizes working day logic to ensure consistency
 */
export function isSeoulWorkingDay(date: Date): boolean {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided to isSeoulWorkingDay');
  }

  // Convert to Seoul timezone first, then check working day
  const seoulDate = convertToSeoulTime(date);
  return isWorkingDay(seoulDate);
}

/**
 * Get the next working day after a given date in Seoul timezone
 * Returns a new Date object representing the next working day
 */
export function getNextSeoulWorkingDay(date: Date): Date {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided to getNextSeoulWorkingDay');
  }

  const seoulDate = convertToSeoulTime(date);
  let nextDay = new Date(seoulDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // Keep advancing until we find a working day
  while (!isWorkingDay(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }

  return nextDay;
}

/**
 * Get the previous working day before a given date in Seoul timezone
 */
export function getPreviousSeoulWorkingDay(date: Date): Date {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided to getPreviousSeoulWorkingDay');
  }

  const seoulDate = convertToSeoulTime(date);
  let previousDay = new Date(seoulDate);
  previousDay.setDate(previousDay.getDate() - 1);

  while (!isWorkingDay(previousDay)) {
    previousDay.setDate(previousDay.getDate() - 1);
  }

  return previousDay;
}

/**
 * Get yesterday's date in Seoul timezone
 * Pure function that doesn't depend on current time
 */
export function getSeoulYesterday(fromDate: Date): Date {
  if (!(fromDate instanceof Date) || isNaN(fromDate.getTime())) {
    throw new Error('Invalid Date object provided to getSeoulYesterday');
  }

  const seoulDate = convertToSeoulTime(fromDate);
  const yesterday = new Date(seoulDate);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
}

// ===== DATE STRING OPERATIONS =====

/**
 * Format a date as YYYY-MM-DD string in Seoul timezone
 * Centralized to ensure consistency across the application
 */
export function formatSeoulDate(date: Date): string {
  return formatSeoulDateString(date);
}

/**
 * Create a Date object from YYYY-MM-DD string (robust version)
 * Creates date in Seoul timezone
 */
export function createSeoulDateFromString(dateString: string): Date {
  if (!isValidDateString(dateString)) {
    throw new Error(`Invalid date string format. Expected YYYY-MM-DD, got: ${dateString}`);
  }
  return new Date(dateString + 'T00:00:00.000Z');
}

/**
 * Compare two YYYY-MM-DD date strings using timestamp comparison
 * @param date1 First date string (YYYY-MM-DD)
 * @param date2 Second date string (YYYY-MM-DD)
 * @returns Negative if date1 < date2, 0 if equal, positive if date1 > date2
 */
export function compareSeoulDateStrings(date1: string, date2: string): number {
  return createSeoulDateFromString(date1).getTime() - createSeoulDateFromString(date2).getTime();
}

/**
 * Check if a date string is before another date string
 * @param date1 First date string (YYYY-MM-DD)
 * @param date2 Second date string (YYYY-MM-DD)
 * @returns true if date1 is before date2
 */
export function isSeoulDateStringBefore(date1: string, date2: string): boolean {
  return compareSeoulDateStrings(date1, date2) < 0;
}

/**
 * Check if a date string is after another date string
 * @param date1 First date string (YYYY-MM-DD)
 * @param date2 Second date string (YYYY-MM-DD)
 * @returns true if date1 is after date2
 */
export function isSeoulDateStringAfter(date1: string, date2: string): boolean {
  return compareSeoulDateStrings(date1, date2) > 0;
}

/**
 * Check if a date string equals another date string
 * @param date1 First date string (YYYY-MM-DD)
 * @param date2 Second date string (YYYY-MM-DD)
 * @returns true if dates are equal
 */
export function isSeoulDateStringEqual(date1: string, date2: string): boolean {
  return compareSeoulDateStrings(date1, date2) === 0;
}

/**
 * Check if a date/time is before or equal to the end of a given date
 * This is useful for deadline checking where posts written on the deadline day should count
 * @param dateTime The date/time to check (as Date object)
 * @param dateString The deadline date string (YYYY-MM-DD)
 * @returns true if dateTime is on or before the end of dateString day
 */
export function isSeoulDateTimeBeforeOrOnDate(dateTime: Date, dateString: string): boolean {
  if (!isValidDateString(dateString)) {
    throw new Error(`Invalid date string format. Expected YYYY-MM-DD, got: ${dateString}`);
  }
  const endOfDeadlineDay = new Date(dateString + 'T23:59:59.999Z');
  return dateTime.getTime() <= endOfDeadlineDay.getTime();
}

/**
 * Compare two dates in Seoul timezone
 * Returns: -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareSeoulDates(date1: Date, date2: Date): number {
  const dateString1 = formatSeoulDate(date1);
  const dateString2 = formatSeoulDate(date2);

  if (dateString1 < dateString2) return -1;
  if (dateString1 > dateString2) return 1;
  return 0;
}

/**
 * Check if date1 is after date2 in Seoul timezone
 */
export function isSeoulDateAfter(date1: Date, date2: Date): boolean {
  return compareSeoulDates(date1, date2) > 0;
}

/**
 * Check if date1 is before date2 in Seoul timezone
 */
export function isSeoulDateBefore(date1: Date, date2: Date): boolean {
  return compareSeoulDates(date1, date2) < 0;
}

/**
 * Check if two dates are the same day in Seoul timezone
 */
export function isSameSeoulDate(date1: Date, date2: Date): boolean {
  return isSameDateInSeoul(date1, date2);
}

// ===== RECOVERY SYSTEM CALENDAR LOGIC =====

/**
 * Recovery requirement calculation result
 */
export interface RecoveryRequirement {
  postsRequired: number;
  currentPosts: number;
  deadline: string; // YYYY-MM-DD format
  missedDate: string; // YYYY-MM-DD format
}

/**
 * Calculate recovery requirements based on missed date and current date
 * Centralizes the recovery business logic
 */
export function calculateRecoveryRequirement(
  missedDate: Date,
  currentDate: Date,
): RecoveryRequirement {
  if (!(missedDate instanceof Date) || isNaN(missedDate.getTime())) {
    throw new Error('Invalid missedDate provided to calculateRecoveryRequirement');
  }
  if (!(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
    throw new Error('Invalid currentDate provided to calculateRecoveryRequirement');
  }

  const seoulCurrentDate = convertToSeoulTime(currentDate);
  const seoulMissedDate = convertToSeoulTime(missedDate);

  const isCurrentWorkingDay = isSeoulWorkingDay(seoulCurrentDate);
  const nextWorkingDay = getNextSeoulWorkingDay(seoulMissedDate);

  return {
    postsRequired: isCurrentWorkingDay ? 2 : 1, // 2 for working day, 1 for weekend
    currentPosts: 0,
    deadline: formatSeoulDate(nextWorkingDay),
    missedDate: formatSeoulDate(seoulMissedDate),
  };
}

/**
 * Check if a deadline has passed compared to current date
 * Both dates are compared in Seoul timezone
 */
export function hasDeadlinePassed(deadlineString: string, currentDate: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadlineString)) {
    throw new Error(`Invalid deadline format. Expected YYYY-MM-DD, got: ${deadlineString}`);
  }

  const currentDateString = formatSeoulDate(currentDate);
  return currentDateString > deadlineString;
}

// ===== POSTING QUERIES =====

/**
 * Query postings for a specific date in Seoul timezone
 * Returns Firebase QuerySnapshot for the date boundaries
 */
export async function queryPostingsForSeoulDate(
  userId: string,
  date: Date,
): Promise<FirebaseFirestore.QuerySnapshot> {
  if (!userId) {
    throw new Error('userId is required for queryPostingsForSeoulDate');
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided to queryPostingsForSeoulDate');
  }

  const { startTimestamp, endTimestamp } = getSeoulDateBoundariesAsTimestamps(date);

  const postingsRef = admin.firestore().collection('users').doc(userId).collection('postings');

  return await postingsRef
    .where('createdAt', '>=', startTimestamp)
    .where('createdAt', '<=', endTimestamp)
    .get();
}

// ===== PURE BUSINESS LOGIC FUNCTIONS =====

/**
 * Pure function: Count posts from query result
 */
export function countPostsFromQueryResult(queryResult: { size: number }): number {
  return queryResult.size;
}

/**
 * Pure function: Check if user has posts from query result
 */
export function hasPostsFromQueryResult(queryResult: { empty: boolean }): boolean {
  return !queryResult.empty;
}

/**
 * Pure function: Determine if user missed yesterday based on posting data
 * @param currentDate - The current date
 * @param hadPostsYesterday - Whether user had posts yesterday
 * @returns true if user missed a working day
 */
export function didUserMissYesterdayPure(currentDate: Date, hadPostsYesterday: boolean): boolean {
  if (!(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
    throw new Error('Invalid Date object provided to didUserMissYesterdayPure');
  }

  const yesterday = getSeoulYesterday(currentDate);

  // Only working days count as "missable"
  if (!isSeoulWorkingDay(yesterday)) {
    return false;
  }

  // True if no postings on working day = missed
  return !hadPostsYesterday;
}

// ===== DATABASE LAYER FUNCTIONS (with side effects) =====

/**
 * Count posts written by user on a specific date in Seoul timezone
 * Centralizes posting count logic
 */
export async function countSeoulDatePosts(userId: string, date: Date): Promise<number> {
  const querySnapshot = await queryPostingsForSeoulDate(userId, date);
  return countPostsFromQueryResult(querySnapshot);
}

/**
 * Check if user has any posts on a specific date in Seoul timezone
 */
export async function hasSeoulDatePosts(userId: string, date: Date): Promise<boolean> {
  const { startTimestamp, endTimestamp } = getSeoulDateBoundariesAsTimestamps(date);

  const postingsRef = admin.firestore().collection('users').doc(userId).collection('postings');

  const querySnapshot = await postingsRef
    .where('createdAt', '>=', startTimestamp)
    .where('createdAt', '<=', endTimestamp)
    .limit(1)
    .get();

  return hasPostsFromQueryResult(querySnapshot);
}

/**
 * Check if user missed yesterday (only working days count)
 * Centralizes the "missed yesterday" logic
 */
export async function didUserMissYesterday(userId: string, currentDate: Date): Promise<boolean> {
  if (!userId) {
    throw new Error('userId is required for didUserMissYesterday');
  }
  if (!(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
    throw new Error('Invalid Date object provided to didUserMissYesterday');
  }

  const yesterday = getSeoulYesterday(currentDate);

  // Only working days count as "missable"
  if (!isSeoulWorkingDay(yesterday)) {
    return false;
  }

  // Check if user had any postings on that working day
  const hasPosts = await hasSeoulDatePosts(userId, yesterday);
  return didUserMissYesterdayPure(currentDate, hasPosts);
}

// ===== STREAK CALCULATIONS =====

/**
 * Get date key for streak calculations (YYYY-MM-DD in Seoul timezone)
 */
export function getSeoulDateKey(date: Date): string {
  return formatSeoulDate(date);
}

/**
 * Generate working days backward from a start date
 * Yields dates in Seoul timezone
 */
export function* generateSeoulWorkingDaysBackward(startDate: Date): Generator<Date> {
  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    throw new Error('Invalid Date object provided to generateSeoulWorkingDaysBackward');
  }

  let currentDate = convertToSeoulTime(startDate);

  while (true) {
    if (isSeoulWorkingDay(currentDate)) {
      yield new Date(currentDate);
    }
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() - 1);
  }
}

/**
 * Check if two dates are consecutive working days in Seoul timezone
 */
export function areConsecutiveSeoulWorkingDays(earlierDate: Date, laterDate: Date): boolean {
  if (!(earlierDate instanceof Date) || isNaN(earlierDate.getTime())) {
    throw new Error('Invalid earlierDate provided to areConsecutiveSeoulWorkingDays');
  }
  if (!(laterDate instanceof Date) || isNaN(laterDate.getTime())) {
    throw new Error('Invalid laterDate provided to areConsecutiveSeoulWorkingDays');
  }

  const seoulEarlierDate = convertToSeoulTime(earlierDate);
  const seoulLaterDate = convertToSeoulTime(laterDate);

  // Check if both are working days
  if (!isSeoulWorkingDay(seoulEarlierDate) || !isSeoulWorkingDay(seoulLaterDate)) {
    return false;
  }

  // Get the next working day after the earlier date
  const nextWorkingDay = getNextSeoulWorkingDay(seoulEarlierDate);

  // Check if it matches the later date
  return isSameSeoulDate(nextWorkingDay, seoulLaterDate);
}

/**
 * Calculate days between two dates, counting only working days
 */
export function countSeoulWorkingDaysBetween(startDate: Date, endDate: Date): number {
  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    throw new Error('Invalid startDate provided to countSeoulWorkingDaysBetween');
  }
  if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
    throw new Error('Invalid endDate provided to countSeoulWorkingDaysBetween');
  }

  const seoulStartDate = convertToSeoulTime(startDate);
  const seoulEndDate = convertToSeoulTime(endDate);

  if (seoulStartDate >= seoulEndDate) {
    return 0;
  }

  let count = 0;
  let currentDate = new Date(seoulStartDate);

  while (currentDate < seoulEndDate) {
    if (isSeoulWorkingDay(currentDate)) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
}

// ===== DATE VALIDATION =====

/**
 * Validate that a date string is in YYYY-MM-DD format
 */
export function isValidDateString(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

/**
 * Parse and validate a date string, returning Seoul date boundaries
 */
export function parseAndValidateSeoulDateString(dateString: string) {
  if (!isValidDateString(dateString)) {
    throw new Error(`Invalid date string format. Expected YYYY-MM-DD, got: ${dateString}`);
  }

  return parseSeoulDateString(dateString);
}

// ===== CURRENT TIME OPERATIONS =====

/**
 * Get current Seoul date for calendar operations
 * Centralizes "now" operations to make testing easier
 */
export function getCurrentSeoulDate(): Date {
  return convertToSeoulTime(new Date());
}

/**
 * Get today's date string in Seoul timezone
 */
export function getTodaySeoulDateString(): string {
  return formatSeoulDate(getCurrentSeoulDate());
}

/**
 * Get yesterday's date string in Seoul timezone
 */
export function getYesterdaySeoulDateString(): string {
  const yesterday = getSeoulYesterday(new Date());
  return formatSeoulDate(yesterday);
}

// ===== DEBUGGING UTILITIES =====

/**
 * Debug utility to show calendar calculation details
 */
export function debugCalendarOperation(
  operation: string,
  date: Date,
): {
  operation: string;
  inputDate: string;
  seoulDate: string;
  seoulDateString: string;
  isWorkingDay: boolean;
} {
  const seoulDate = convertToSeoulTime(date);

  return {
    operation,
    inputDate: date.toISOString(),
    seoulDate: seoulDate.toISOString(),
    seoulDateString: formatSeoulDate(seoulDate),
    isWorkingDay: isSeoulWorkingDay(seoulDate),
  };
}
