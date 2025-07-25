import { Timestamp } from "firebase-admin/firestore";
import admin from "../shared/admin";
import { toSeoulDate, isWorkingDay } from "../shared/dateUtils";
import { RecoveryRequirement, StreakInfo, RecoveryStatusType } from "./StreakInfo";

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
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
 */
export function getNextWorkingDay(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  
  // Keep advancing until we find a working day
  while (!isWorkingDay(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  
  return nextDay;
}

/**
 * Calculate recovery requirement based on missed date and current date
 */
export function calculateRecoveryRequirement(missedDate: Date, currentDate: Date): RecoveryRequirement {
  const isCurrentWorkingDay = isWorkingDay(currentDate);
  const nextWorkingDay = getNextWorkingDay(missedDate);
  
  return {
    postsRequired: isCurrentWorkingDay ? 2 : 1,  // 2 for working day, 1 for weekend
    currentPosts: 0,
    deadline: formatDateString(nextWorkingDay),
    missedDate: formatDateString(missedDate)
  };
}

/**
 * Check if user missed yesterday (only working days count)
 */
export async function didUserMissYesterday(userId: string, currentDate: Date): Promise<boolean> {
  const seoulDate = toSeoulDate(currentDate);
  const yesterday = new Date(seoulDate);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Only working days count as "missable"
  if (!isWorkingDay(yesterday)) {
    return false;
  }
  
  // Check if user had any postings on that working day
  const postingsRef = admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('postings');
    
  // Create Seoul timezone date boundaries for yesterday
  // Use formatDateString to get YYYY-MM-DD format, then create proper Seoul timezone boundaries
  const yesterdayDateString = formatDateString(yesterday);
  
  // Create start and end of day in Seoul timezone
  const startOfDaySeoul = new Date(`${yesterdayDateString}T00:00:00+09:00`);
  const endOfDaySeoul = new Date(`${yesterdayDateString}T23:59:59.999+09:00`);
  
  const postingsSnapshot = await postingsRef
    .where('createdAt', '>=', Timestamp.fromDate(startOfDaySeoul))
    .where('createdAt', '<=', Timestamp.fromDate(endOfDaySeoul))
    .limit(1)
    .get();
    
  return postingsSnapshot.empty; // True if no postings = missed
}

/**
 * Count posts written by user on a specific date
 */
export async function countPostsOnDate(userId: string, date: Date): Promise<number> {
  // Create Seoul timezone date boundaries
  // Use formatDateString to get YYYY-MM-DD format, then create proper Seoul timezone boundaries
  const dateString = formatDateString(date);
  
  // Create start and end of day in Seoul timezone
  const startOfDaySeoul = new Date(`${dateString}T00:00:00+09:00`);
  const endOfDaySeoul = new Date(`${dateString}T23:59:59.999+09:00`);
  
  const postingsRef = admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('postings');
    
  const postingsSnapshot = await postingsRef
    .where('createdAt', '>=', Timestamp.fromDate(startOfDaySeoul))
    .where('createdAt', '<=', Timestamp.fromDate(endOfDaySeoul))
    .get();
    
  return postingsSnapshot.size;
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