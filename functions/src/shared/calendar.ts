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

import { isWeekend, addDays, subDays, isSameDay, isAfter, isBefore, endOfDay } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { Timestamp } from 'firebase-admin/firestore';
import admin from './admin';
import { YearHolidays } from './types/Holiday';

const SEOUL_TIMEZONE = 'Asia/Seoul';

// Cache for configurable holidays to minimize Firestore reads
let holidaysCache: Map<string, string> | null = null;
let holidaysCacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

// ===== CORE SEOUL TIMEZONE UTILITIES =====

/**
 * Format a date as YYYY-MM-DD string in Seoul timezone
 */
export function formatSeoulDate(date: Date): string {
  return formatInTimeZone(date, SEOUL_TIMEZONE, 'yyyy-MM-dd');
}

/**
 * Get date boundaries for a Seoul date (start and end of day in Seoul timezone)
 * Returns UTC timestamps for Firestore queries
 */
export function getSeoulDateBoundaries(date: Date): {
  startTimestamp: Timestamp;
  endTimestamp: Timestamp;
} {
  const dateString = formatSeoulDate(date);

  // Create start of day in Seoul timezone, then convert to UTC
  const startOfDaySeoul = fromZonedTime(`${dateString}T00:00:00`, SEOUL_TIMEZONE);
  const endOfDaySeoul = fromZonedTime(`${dateString}T23:59:59.999`, SEOUL_TIMEZONE);

  return {
    startTimestamp: Timestamp.fromDate(startOfDaySeoul),
    endTimestamp: Timestamp.fromDate(endOfDaySeoul),
  };
}

/**
 * Check if two dates are the same day in Seoul timezone
 */
export function isSameDateInSeoul(date1: Date, date2: Date): boolean {
  return formatSeoulDate(date1) === formatSeoulDate(date2);
}

/**
 * Get current date in Seoul timezone
 */
export function getCurrentSeoulDate(): Date {
  return toZonedTime(new Date(), SEOUL_TIMEZONE);
}

// ===== CONFIGURABLE HOLIDAYS =====

/**
 * Get unique years from a date range
 */
function getYearsInRange(startDate: Date, endDate: Date): string[] {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear === endYear) {
    return [startYear.toString()];
  }

  return [startYear.toString(), endYear.toString()];
}

/**
 * Fetch holidays for a specific year from year-sharded structure
 */
async function fetchHolidaysForYear(year: string): Promise<Map<string, string>> {
  try {
    const yearDocRef = admin.firestore().collection('holidays').doc(year);
    const snapshot = await yearDocRef.get();

    const holidayMap = new Map<string, string>();

    if (snapshot.exists) {
      const data = snapshot.data() as YearHolidays;
      if (data?.items && Array.isArray(data.items)) {
        data.items.forEach((holiday) => {
          holidayMap.set(holiday.date, holiday.name);
        });
      }
    }

    return holidayMap;
  } catch (error) {
    console.error(`Error fetching holidays for year ${year}:`, error);
    return new Map<string, string>();
  }
}

/**
 * Fetch configurable holidays from Firestore with caching
 * Uses year-sharded structure
 */
async function fetchConfigurableHolidays(): Promise<Map<string, string>> {
  const now = Date.now();

  // Return cached data if still valid
  if (holidaysCache && now - holidaysCacheTimestamp < CACHE_TTL) {
    return holidaysCache;
  }

  try {
    // Fetch current year ± 1 for typical use cases
    const today = new Date();
    const startDate = new Date(today);
    startDate.setFullYear(today.getFullYear() - 1);
    const endDate = new Date(today);
    endDate.setFullYear(today.getFullYear() + 1);

    const years = getYearsInRange(startDate, endDate);

    // Fetch year-based documents
    const yearPromises = years.map(year => fetchHolidaysForYear(year));
    const yearMaps = await Promise.all(yearPromises);

    // Merge all year maps
    const mergedMap = new Map<string, string>();
    yearMaps.forEach(yearMap => {
      yearMap.forEach((name, date) => {
        mergedMap.set(date, name);
      });
    });

    // Update cache
    holidaysCache = mergedMap;
    holidaysCacheTimestamp = now;

    return mergedMap;
  } catch (error) {
    console.error('Error fetching configurable holidays:', error);
    return new Map<string, string>();
  }
}

/**
 * Check if a date is a configurable holiday
 */
function isConfigurableHoliday(date: Date, holidayMap: Map<string, string>): boolean {
  const dateKey = formatSeoulDate(date);
  return holidayMap.has(dateKey);
}

// ===== WORKING DAY OPERATIONS =====

/**
 * Check if a date is a working day in Seoul timezone
 * Centralizes working day logic to ensure consistency
 *
 * NOTE: Currently only checks weekends. Configurable holidays are checked
 * separately in the frontend. This is synchronous to maintain compatibility
 * with existing pure functions in streak calculations.
 *
 * For async holiday checking, use isSeoulWorkingDayAsync() instead.
 */
export function isSeoulWorkingDay(date: Date): boolean {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided to isSeoulWorkingDay');
  }

  // Check day of week directly in Seoul timezone without date conversion
  const dayOfWeek = date.toLocaleDateString('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  });

  // Weekend check: Saturday = 'Sat', Sunday = 'Sun'
  const isWeekendDay = dayOfWeek === 'Sat' || dayOfWeek === 'Sun';

  return !isWeekendDay;
}

/**
 * Async version that includes configurable holidays check
 * Use this when you need to check holidays and can handle async
 */
export async function isSeoulWorkingDayAsync(date: Date): Promise<boolean> {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided to isSeoulWorkingDayAsync');
  }

  // First check weekends (synchronous)
  if (!isSeoulWorkingDay(date)) {
    return false;
  }

  // Then check configurable holidays (async)
  const holidays = await fetchConfigurableHolidays();
  if (isConfigurableHoliday(date, holidays)) {
    return false;
  }

  return true;
}

/**
 * Check if a given date is Friday in Seoul timezone
 * Used for recovery policy calculation
 */
export function isSeoulFriday(date: Date): boolean {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided to isSeoulFriday');
  }

  const dayOfWeek = date.toLocaleDateString('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
  });

  return dayOfWeek === 'Fri';
}

/**
 * Get the next working day after a given date in Seoul timezone
 * Returns a new Date object representing the next working day
 */
export function getNextSeoulWorkingDay(date: Date): Date {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided to getNextSeoulWorkingDay');
  }

  // Convert to Seoul timezone for calculations
  const seoulDate = toZonedTime(date, SEOUL_TIMEZONE);
  let nextDay = addDays(seoulDate, 1);

  // Keep advancing until we find a working day (not weekend)
  while (isWeekend(nextDay)) {
    nextDay = addDays(nextDay, 1);
  }

  // Convert back to UTC for consistency
  return fromZonedTime(nextDay, SEOUL_TIMEZONE);
}

/**
 * Get the previous working day before a given date in Seoul timezone
 */
export function getPreviousSeoulWorkingDay(date: Date): Date {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid Date object provided to getPreviousSeoulWorkingDay');
  }

  // Convert to Seoul timezone for calculations
  const seoulDate = toZonedTime(date, SEOUL_TIMEZONE);
  let previousDay = subDays(seoulDate, 1);

  while (isWeekend(previousDay)) {
    previousDay = subDays(previousDay, 1);
  }

  // Convert back to UTC for consistency
  return fromZonedTime(previousDay, SEOUL_TIMEZONE);
}

/**
 * Get yesterday's date in Seoul timezone
 * Pure function that doesn't depend on current time
 */
export function getSeoulYesterday(fromDate: Date): Date {
  if (!(fromDate instanceof Date) || isNaN(fromDate.getTime())) {
    throw new Error('Invalid Date object provided to getSeoulYesterday');
  }

  const seoulDate = toZonedTime(fromDate, SEOUL_TIMEZONE);
  return subDays(seoulDate, 1);
}

// ===== DATE STRING OPERATIONS =====

// formatSeoulDate is already defined above

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
  const endOfDeadlineDay = endOfDay(new Date(dateString + 'T00:00:00.000Z'));
  // Use negated isAfter to properly handle exact equality at end of day
  return !isAfter(dateTime, endOfDeadlineDay);
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
  deadline: Timestamp;
  missedDate: Timestamp;
}

/**
 * Calculate recovery requirements based on missed date and current date
 * CRITICAL: Recovery deadline is end of the day AFTER missed date
 * - Miss Monday → Recover by Tuesday 23:59:59 KST
 * - Miss Friday → Recover by Saturday 23:59:59 KST
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

  const seoulCurrentDate = toZonedTime(currentDate, SEOUL_TIMEZONE);
  const seoulMissedDate = toZonedTime(missedDate, SEOUL_TIMEZONE);

  const isCurrentWorkingDay = isSeoulWorkingDay(seoulCurrentDate);
  
  // CRITICAL: Recovery deadline is exactly 1 calendar day after missed date (not working day)
  // This gives users until end of next day to recover
  const nextDay = addDays(seoulMissedDate, 1);
  const deadlineEndOfDay = endOfDay(nextDay);

  return {
    postsRequired: isCurrentWorkingDay ? 2 : 1, // 2 for working day, 1 for weekend
    currentPosts: 0,
    deadline: Timestamp.fromDate(deadlineEndOfDay), // End of next calendar day
    missedDate: Timestamp.fromDate(seoulMissedDate),
  };
}

/**
 * Check if a deadline has passed compared to current date
 * Both dates are compared in Seoul timezone
 */
export function hasDeadlinePassed(deadline: Timestamp, currentDate: Date): boolean {
  if (!deadline) {
    throw new Error('Invalid deadline provided to hasDeadlinePassed');
  }

  const currentTimestamp = Timestamp.fromDate(currentDate);
  return currentTimestamp.toMillis() > deadline.toMillis();
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

  const { startTimestamp, endTimestamp } = getSeoulDateBoundaries(date);

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
  const { startTimestamp, endTimestamp } = getSeoulDateBoundaries(date);

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

  let currentDate = toZonedTime(startDate, SEOUL_TIMEZONE);

  while (true) {
    if (isSeoulWorkingDay(currentDate)) {
      yield new Date(currentDate);
    }
    currentDate = subDays(currentDate, 1);
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

  const seoulEarlierDate = toZonedTime(earlierDate, SEOUL_TIMEZONE);
  const seoulLaterDate = toZonedTime(laterDate, SEOUL_TIMEZONE);

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

  const seoulStartDate = toZonedTime(startDate, SEOUL_TIMEZONE);
  const seoulEndDate = toZonedTime(endDate, SEOUL_TIMEZONE);

  if (isAfter(seoulStartDate, seoulEndDate) || isSameDay(seoulStartDate, seoulEndDate)) {
    return 0;
  }

  let count = 0;
  let currentDate = new Date(seoulStartDate);

  while (isBefore(currentDate, seoulEndDate)) {
    if (isSeoulWorkingDay(currentDate)) {
      count++;
    }
    currentDate = addDays(currentDate, 1);
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
  return getSeoulDateBoundaries(new Date(dateString + 'T12:00:00Z'));
}

// ===== CURRENT TIME OPERATIONS =====

// getCurrentSeoulDate is already defined above

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
  const seoulDate = toZonedTime(date, SEOUL_TIMEZONE);

  return {
    operation,
    inputDate: date.toISOString(),
    seoulDate: seoulDate.toISOString(),
    seoulDateString: formatSeoulDate(seoulDate),
    isWorkingDay: isSeoulWorkingDay(seoulDate),
  };
}
