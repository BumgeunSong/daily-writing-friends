import { addDays, parseISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { Timestamp } from 'firebase-admin/firestore';
import admin from '../../shared/admin';
import { Holiday, YearHolidays, HolidayMap, toHolidayMap } from '../types/Holiday';

// ===== HOLIDAY FETCHING & CACHING =====

// Cache for holidays to minimize Firestore reads
// Key: year string (e.g., "2024"), Value: { data, timestamp }
const holidaysCacheByYear = new Map<string, { data: Holiday[]; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

/**
 * Fetch holidays for a specific year from Firestore
 * Uses year-sharded structure: /holidays/{year}
 * Implements per-year caching to avoid race conditions
 */
async function fetchHolidaysForYear(year: string): Promise<Holiday[]> {
  const now = Date.now();

  // Check cache for this specific year
  const cached = holidaysCacheByYear.get(year);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const yearDocRef = admin.firestore().collection('holidays').doc(year);
    const snapshot = await yearDocRef.get();

    if (!snapshot.exists) {
      // Cache empty result to avoid repeated lookups
      holidaysCacheByYear.set(year, { data: [], timestamp: now });
      return [];
    }

    const data = snapshot.data() as YearHolidays;
    const holidays = data?.items ?? [];

    // Cache the result for this specific year
    holidaysCacheByYear.set(year, { data: holidays, timestamp: now });

    return holidays;
  } catch (error) {
    console.error(`Error fetching holidays for year ${year}:`, error);
    return [];
  }
}

/**
 * Fetch holidays for a date range (YYYY-MM-DD format)
 * Returns HolidayMap for O(1) lookups
 *
 * Uses per-year caching to avoid race conditions in concurrent requests.
 * Each year is cached independently with its own TTL.
 */
export async function fetchHolidaysForDateRange(
  startDayKey: string,
  endDayKey: string,
): Promise<HolidayMap> {
  try {
    // Extract years from date range
    const startYear = startDayKey.substring(0, 4);
    const endYear = endDayKey.substring(0, 4);

    const years = new Set<string>([startYear]);
    if (endYear !== startYear) {
      years.add(endYear);
    }

    // Fetch all years in parallel (uses per-year cache internally)
    const yearPromises = Array.from(years).map((y) => fetchHolidaysForYear(y));
    const yearResults = await Promise.all(yearPromises);
    const allHolidays = yearResults.flat();

    // Convert to map (no global cache - each request builds its own map)
    return toHolidayMap(allHolidays);
  } catch (error) {
    console.error('Error fetching holidays for date range:', error);
    return new Map<string, string>();
  }
}

/**
 * Check if a dayKey is a holiday
 * @internal - exported for testing, will be used internally in next step
 */
export function isHolidayByDayKey(dayKey: string, holidayMap?: HolidayMap): boolean {
  if (!holidayMap) return false;
  return holidayMap.has(dayKey);
}

// ===== WORKING DAY OPERATIONS =====

/**
 * Check if a dayKey represents a working day in the given timezone.
 * Working days: Monday-Friday, excluding weekends and holidays
 * Non-working days: Saturday-Sunday, and configured holidays
 *
 * @param dayKey - Date string in YYYY-MM-DD format
 * @param timezone - IANA timezone (e.g., 'Asia/Seoul', 'America/New_York')
 * @param holidayMap - Optional pre-fetched holiday map for O(1) lookups
 * @returns true if working day, false if weekend or holiday
 */
export function isWorkingDayByTz(
  dayKey: string,
  timezone: string,
  holidayMap?: HolidayMap,
): boolean {
  // Parse dayKey and get day-of-week in the specified timezone
  // ISO day-of-week: 1=Mon, 2=Tue, ..., 5=Fri, 6=Sat, 7=Sun
  const dayOfWeek = Number(formatInTimeZone(parseISO(dayKey), timezone, 'i'));
  const isWeekend = dayOfWeek < 1 || dayOfWeek > 5;

  // Not a working day if weekend
  if (isWeekend) return false;

  // Not a working day if it's a configured holiday
  if (isHolidayByDayKey(dayKey, holidayMap)) return false;

  return true;
}

/**
 * Async version of isWorkingDayByTz that auto-fetches holidays
 * Use this when you need standalone holiday checking and can handle async
 *
 * For batch operations, prefer fetching holidays once and passing to isWorkingDayByTz()
 *
 * @param dayKey - Date string in YYYY-MM-DD format
 * @param timezone - IANA timezone
 * @returns Promise<boolean> - true if working day, false if weekend or holiday
 */
export async function isWorkingDayByTzAsync(
  dayKey: string,
  timezone: string,
): Promise<boolean> {
  // Fetch holidays for this day (uses cache)
  const holidays = await fetchHolidaysForDateRange(dayKey, dayKey);
  return isWorkingDayByTz(dayKey, timezone, holidays);
}

/**
 * Get the next working day from a given dayKey in the specified timezone.
 * Skips weekends (Saturday, Sunday) and holidays.
 *
 * @param dayKey - Starting date string in YYYY-MM-DD format
 * @param timezone - IANA timezone
 * @param holidayMap - Optional pre-fetched holiday map
 * @returns Next working day in YYYY-MM-DD format
 * @throws Error if no working day found within 365 days (data corruption guard)
 */
export function getNextWorkingDayKey(
  dayKey: string,
  timezone: string,
  holidayMap?: HolidayMap,
): string {
  const currentDate = parseISO(dayKey);
  let nextDate = addDays(currentDate, 1);
  const MAX_ITERATIONS = 365; // Guard against infinite loops
  let iterations = 0;

  while (
    !isWorkingDayByTz(formatInTimeZone(nextDate, timezone, 'yyyy-MM-dd'), timezone, holidayMap)
  ) {
    iterations++;
    if (iterations >= MAX_ITERATIONS) {
      // This should never happen unless there's a data corruption issue
      // (e.g., all days marked as holidays for a year)
      throw new Error(
        `Could not find next working day within ${MAX_ITERATIONS} days from ${dayKey}. ` +
          'Possible holiday data corruption.',
      );
    }
    nextDate = addDays(nextDate, 1);
  }

  return formatInTimeZone(nextDate, timezone, 'yyyy-MM-dd');
}

/**
 * Compute the deadline Timestamp for recovery.
 * Deadline is the end of the recovery day (23:59:59.999) in the user's timezone.
 *
 * @param recoveryDayKey - The day when recovery is possible (YYYY-MM-DD)
 * @param timezone - IANA timezone
 * @returns Firestore Timestamp representing end of recovery day
 */
export function computeDeadline(recoveryDayKey: string, timezone: string): Timestamp {
  // Create end-of-day timestamp in user's timezone
  // fromZonedTime interprets the date string AS IF it's in the specified timezone
  // and returns the equivalent UTC Date object
  const endOfDayLocal = fromZonedTime(`${recoveryDayKey}T23:59:59.999`, timezone);
  return Timestamp.fromDate(endOfDayLocal);
}

/**
 * Compute the streak increment based on the missed day.
 * Friday miss → +1 on successful recovery
 * Mon-Thu miss → +2 on successful recovery
 *
 * @param missedDayKey - The dayKey that was missed (YYYY-MM-DD)
 * @param timezone - IANA timezone
 * @returns 1 for Friday, 2 for Mon-Thu
 */
export function computeStreakIncrement(missedDayKey: string, timezone: string): 1 | 2 {
  // ISO day-of-week: 1=Mon, ..., 5=Fri
  const dayOfWeek = Number(formatInTimeZone(parseISO(missedDayKey), timezone, 'i'));
  return dayOfWeek === 5 ? 1 : 2; // Friday → 1, Mon-Thu → 2
}

/**
 * Compute the recovery window for a missed day.
 * - Friday miss → recover by end of Saturday (next day)
 * - Mon-Thu miss → recover by end of next working day (skips holidays)
 *
 * @param missedDayKey - The dayKey that was missed (YYYY-MM-DD)
 * @param timezone - IANA timezone
 * @param holidayMap - Optional pre-fetched holiday map
 * @returns Object with recoveryDayKey, postsRequired, and deadline
 */
export function computeRecoveryWindow(
  missedDayKey: string,
  timezone: string,
  holidayMap?: HolidayMap,
): {
  recoveryDayKey: string;
  postsRequired: 1 | 2;
  deadline: Timestamp;
} {
  const dayOfWeek = Number(formatInTimeZone(parseISO(missedDayKey), timezone, 'i'));

  if (dayOfWeek === 5) {
    // Friday miss → recover on Saturday (next day)
    const saturdayDate = addDays(parseISO(missedDayKey), 1);
    const saturdayDayKey = formatInTimeZone(saturdayDate, timezone, 'yyyy-MM-dd');

    return {
      recoveryDayKey: saturdayDayKey,
      postsRequired: 1,
      deadline: computeDeadline(saturdayDayKey, timezone),
    };
  } else {
    // Mon-Thu miss → recover on next working day (skips weekends and holidays)
    const nextWorkingDayKey = getNextWorkingDayKey(missedDayKey, timezone, holidayMap);

    return {
      recoveryDayKey: nextWorkingDayKey,
      postsRequired: 2,
      deadline: computeDeadline(nextWorkingDayKey, timezone),
    };
  }
}

/**
 * Get the end-of-day Timestamp for a given dayKey in the user's timezone.
 *
 * @param dayKey - Date string in YYYY-MM-DD format
 * @param timezone - IANA timezone
 * @returns Firestore Timestamp representing end of day (23:59:59.999)
 */
export function getEndOfDay(dayKey: string, timezone: string): Timestamp {
  return computeDeadline(dayKey, timezone);
}
