import { Timestamp } from 'firebase-admin/firestore';
import { addDays, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

/**
 * Check if a dayKey represents a working day in the given timezone.
 * Working days: Monday-Friday
 * Non-working days: Saturday-Sunday
 *
 * @param dayKey - Date string in YYYY-MM-DD format
 * @param timezone - IANA timezone (e.g., 'Asia/Seoul', 'America/New_York')
 * @returns true if working day, false if weekend
 */
export function isWorkingDayByTz(dayKey: string, timezone: string): boolean {
  // Parse dayKey and get day-of-week in the specified timezone
  // ISO day-of-week: 1=Mon, 2=Tue, ..., 5=Fri, 6=Sat, 7=Sun
  const dayOfWeek = Number(formatInTimeZone(parseISO(dayKey), timezone, 'i'));
  return dayOfWeek >= 1 && dayOfWeek <= 5; // Mon-Fri
}

/**
 * Get the next working day from a given dayKey in the specified timezone.
 * Skips weekends (Saturday, Sunday).
 *
 * @param dayKey - Starting date string in YYYY-MM-DD format
 * @param timezone - IANA timezone
 * @returns Next working day in YYYY-MM-DD format
 */
export function getNextWorkingDayKey(dayKey: string, timezone: string): string {
  let currentDate = parseISO(dayKey);
  let nextDate = addDays(currentDate, 1);

  while (!isWorkingDayByTz(formatInTimeZone(nextDate, timezone, 'yyyy-MM-dd'), timezone)) {
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
  const endOfDayLocal = toZonedTime(`${recoveryDayKey}T23:59:59.999`, timezone);
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
 * - Mon-Thu miss → recover by end of next working day
 *
 * @param missedDayKey - The dayKey that was missed (YYYY-MM-DD)
 * @param timezone - IANA timezone
 * @returns Object with recoveryDayKey, postsRequired, and deadline
 */
export function computeRecoveryWindow(
  missedDayKey: string,
  timezone: string,
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
    // Mon-Thu miss → recover on next working day
    const nextWorkingDayKey = getNextWorkingDayKey(missedDayKey, timezone);

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
