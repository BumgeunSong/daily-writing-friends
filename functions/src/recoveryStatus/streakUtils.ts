import { Timestamp } from "firebase-admin/firestore";
import admin from "../admin";
import { toSeoulDate, isWorkingDay } from "../dateUtils";
import { RecoveryRequirement, StreakInfo } from "../types/StreakInfo";

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
  
  // yesterdayKey could be used for logging if needed
  // const yesterdayKey = formatDateString(yesterday);
  
  // Check if user had any postings on that working day
  const postingsRef = admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('postings');
    
  const startOfDay = new Date(yesterday);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(yesterday);
  endOfDay.setHours(23, 59, 59, 999);
  
  const postingsSnapshot = await postingsRef
    .where('createdAt', '>=', Timestamp.fromDate(startOfDay))
    .where('createdAt', '<=', Timestamp.fromDate(endOfDay))
    .limit(1)
    .get();
    
  return postingsSnapshot.empty; // True if no postings = missed
}

/**
 * Count posts written by user on a specific date
 */
export async function countPostsOnDate(userId: string, date: Date): Promise<number> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const postingsRef = admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('postings');
    
  const postingsSnapshot = await postingsRef
    .where('createdAt', '>=', Timestamp.fromDate(startOfDay))
    .where('createdAt', '<=', Timestamp.fromDate(endOfDay))
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
        type: 'onStreak'
      }
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