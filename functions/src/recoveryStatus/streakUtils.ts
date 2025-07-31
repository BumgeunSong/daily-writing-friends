import { Timestamp } from "firebase-admin/firestore";
import admin from "../shared/admin";
import { 
  formatSeoulDate,
  calculateRecoveryRequirement as calculateRecoveryReq,
  didUserMissYesterday as didMissYesterday,
  countSeoulDatePosts,
  RecoveryRequirement
} from "../shared/calendar";
import { StreakInfo, RecoveryStatusType } from "./StreakInfo";

/**
 * Format date to YYYY-MM-DD string in Seoul timezone
 * @deprecated Use formatSeoulDate from calendar.ts instead
 */
export function formatDateString(date: Date): string {
  return formatSeoulDate(date);
}

/**
 * Parse YYYY-MM-DD string to Date
 */
export function parseDateString(dateString: string): Date {
  return new Date(dateString + 'T00:00:00.000Z');
}

/**
 * Create a Date object from YYYY-MM-DD string (robust version)
 */
export function createDateFromString(dateString: string): Date {
  return new Date(dateString + 'T00:00:00.000Z');
}

/**
 * Compare two YYYY-MM-DD date strings using timestamp comparison
 * @param date1 First date string (YYYY-MM-DD)
 * @param date2 Second date string (YYYY-MM-DD)
 * @returns Negative if date1 < date2, 0 if equal, positive if date1 > date2
 */
export function compareDateStrings(date1: string, date2: string): number {
  return createDateFromString(date1).getTime() - createDateFromString(date2).getTime();
}

/**
 * Check if a date string is before another date string
 * @param date1 First date string (YYYY-MM-DD)
 * @param date2 Second date string (YYYY-MM-DD)
 * @returns true if date1 is before date2
 */
export function isDateBefore(date1: string, date2: string): boolean {
  return compareDateStrings(date1, date2) < 0;
}

/**
 * Check if a date string is after another date string
 * @param date1 First date string (YYYY-MM-DD)
 * @param date2 Second date string (YYYY-MM-DD)
 * @returns true if date1 is after date2
 */
export function isDateAfter(date1: string, date2: string): boolean {
  return compareDateStrings(date1, date2) > 0;
}

/**
 * Check if a date string equals another date string
 * @param date1 First date string (YYYY-MM-DD)
 * @param date2 Second date string (YYYY-MM-DD)
 * @returns true if dates are equal
 */
export function isDateEqual(date1: string, date2: string): boolean {
  return compareDateStrings(date1, date2) === 0;
}

/**
 * Check if a date/time is before or equal to the end of a given date
 * This is useful for deadline checking where posts written on the deadline day should count
 * @param dateTime The date/time to check (as Date object)
 * @param dateString The deadline date string (YYYY-MM-DD)
 * @returns true if dateTime is on or before the end of dateString day
 */
export function isDateTimeBeforeOrOnDate(dateTime: Date, dateString: string): boolean {
  const endOfDeadlineDay = new Date(dateString + 'T23:59:59.999Z');
  return dateTime.getTime() <= endOfDeadlineDay.getTime();
}

/**
 * Get the next working day after the given date
 * @deprecated Use getNextSeoulWorkingDay from calendar.ts instead
 */
export function getNextWorkingDay(date: Date): Date {
  // This is now handled by the calendar module
  throw new Error('getNextWorkingDay is deprecated. Use getNextSeoulWorkingDay from calendar.ts instead');
}

/**
 * Calculate recovery requirement based on missed date and current date
 * @deprecated Use calculateRecoveryRequirement from calendar.ts instead
 */
export function calculateRecoveryRequirement(missedDate: Date, currentDate: Date): RecoveryRequirement {
  return calculateRecoveryReq(missedDate, currentDate);
}

/**
 * Check if user missed yesterday (only working days count)
 * @deprecated Use didUserMissYesterday from calendar.ts instead
 */
export async function didUserMissYesterday(userId: string, currentDate: Date): Promise<boolean> {
  return await didMissYesterday(userId, currentDate);
}

/**
 * Count posts written by user on a specific date in Seoul timezone
 * @deprecated Use countSeoulDatePosts from calendar.ts instead
 */
export async function countPostsOnDate(userId: string, date: Date): Promise<number> {
  return await countSeoulDatePosts(userId, date);
}

/**
 * Get or create streak info document for user
 */
export async function getOrCreateStreakInfo(userId: string): Promise<{ doc: FirebaseFirestore.DocumentReference, data: StreakInfo | null }> {
  const streakInfoRef = admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('streakInfo')
    .doc('current');
    
  const doc = await streakInfoRef.get();
  
  if (!doc.exists) {
    // Create default streak info
    const defaultStreakInfo: StreakInfo = {
      lastContributionDate: formatDateString(new Date()),
      lastCalculated: Timestamp.now(),
      status: {
        type: RecoveryStatusType.ON_STREAK
      },
      currentStreak: 0,
      longestStreak: 0
    };
    
    await streakInfoRef.set(defaultStreakInfo);
    return { doc: streakInfoRef, data: defaultStreakInfo };
  }
  
  return { doc: streakInfoRef, data: doc.data() as StreakInfo };
}

/**
 * Update streak info document
 */
export async function updateStreakInfo(userId: string, updates: Partial<StreakInfo>): Promise<void> {
  const streakInfoRef = admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('streakInfo')
    .doc('current');
    
  await streakInfoRef.update({
    ...updates,
    lastCalculated: Timestamp.now()
  });
}