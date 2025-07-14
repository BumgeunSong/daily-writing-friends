import admin from "../admin";
import { RecoveryStatus } from "../types/User";

// Helper function to check if a date is a working day (Mon-Fri)
function isWorkingDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5; // Monday = 1, Friday = 5
}

// Helper function to get previous working day
function getPreviousWorkingDay(date: Date): Date {
  let prevDate = new Date(date);
  prevDate.setDate(prevDate.getDate() - 1);
  
  while (!isWorkingDay(prevDate)) {
    prevDate.setDate(prevDate.getDate() - 1);
  }
  
  return prevDate;
}

// Helper function to get date key in YYYY-MM-DD format (KST)
function getDateKey(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.format(date).split('/');
  return `${parts[2]}-${parts[0]}-${parts[1]}`;
}

// Helper function to get postings count for a specific date
async function getPostingsCountForDate(userId: string, dateKey: string): Promise<number> {
  const postingsRef = admin.firestore().collection('users').doc(userId).collection('postings');
  const startOfDay = new Date(dateKey + 'T00:00:00+09:00');
  const endOfDay = new Date(dateKey + 'T23:59:59+09:00');
  
  const q = postingsRef
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
    .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endOfDay));
  
  const snapshot = await q.get();
  return snapshot.size;
}

// Helper function to check if previous working day has postings
async function hasPreviousWorkingDayPosting(userId: string, currentDate: Date): Promise<boolean> {
  const prevWorkingDay = getPreviousWorkingDay(currentDate);
  const prevDateKey = getDateKey(prevWorkingDay);
  const count = await getPostingsCountForDate(userId, prevDateKey);
  return count > 0;
}

/**
 * Calculate recovery status for a user
 * @param userId - User ID
 * @param currentDate - Current date (defaults to now)
 * @returns RecoveryStatus
 */
export async function calculateRecoveryStatus(userId: string, currentDate: Date = new Date()): Promise<RecoveryStatus> {
  const todayKey = getDateKey(currentDate);
  
  // Check if previous working day has postings
  const hasPrevPosting = await hasPreviousWorkingDayPosting(userId, currentDate);
  
  // If previous working day has posting, no recovery needed
  if (hasPrevPosting) {
    return 'none';
  }
  
  // Previous working day has no posting - check today's postings
  const todayPostingsCount = await getPostingsCountForDate(userId, todayKey);
  
  if (todayPostingsCount === 0) {
    return 'eligible';
  } else if (todayPostingsCount === 1) {
    return 'partial';
  } else {
    return 'success';
  }
}

/**
 * Update recovery status for a user in Firestore
 * @param userId - User ID
 * @param recoveryStatus - New recovery status
 */
export async function updateUserRecoveryStatus(userId: string, recoveryStatus: RecoveryStatus): Promise<void> {
  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    await userRef.update({
      recoveryStatus: recoveryStatus,
    });
    
    console.log(`Updated recovery status for user ${userId} to ${recoveryStatus}`);
  } catch (error) {
    console.error(`Error updating recovery status for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Calculate and update recovery status for a user
 * @param userId - User ID
 * @param currentDate - Current date (defaults to now)
 */
export async function calculateAndUpdateRecoveryStatus(userId: string, currentDate: Date = new Date()): Promise<void> {
  const recoveryStatus = await calculateRecoveryStatus(userId, currentDate);
  await updateUserRecoveryStatus(userId, recoveryStatus);
}