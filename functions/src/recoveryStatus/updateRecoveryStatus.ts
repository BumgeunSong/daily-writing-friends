import admin from "../admin";
import { RecoveryStatus } from "../types/User";

// Helper function to convert Date to Asia/Seoul timezone
function toSeoulDate(date: Date): Date {
  const seoulTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return seoulTime;
}

// Helper function to check if a date is a working day (Mon-Fri) in Asia/Seoul timezone
function isWorkingDay(date: Date): boolean {
  const seoulDate = toSeoulDate(date);
  const day = seoulDate.getDay();
  return day >= 1 && day <= 5; // Monday = 1, Friday = 5
}

// Helper function to get previous working day in Asia/Seoul timezone
function getPreviousWorkingDay(date: Date): Date {
  const seoulDate = toSeoulDate(date);
  let prevDate = new Date(seoulDate);
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
  console.log(`[UpdateRecoveryStatus] Getting postings count for user ${userId} on date ${dateKey}`);
  
  const postingsRef = admin.firestore().collection('users').doc(userId).collection('postings');
  const startOfDay = new Date(dateKey + 'T00:00:00+09:00');
  const endOfDay = new Date(dateKey + 'T23:59:59+09:00');
  
  console.log(`[UpdateRecoveryStatus] Query range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
  
  const q = postingsRef
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
    .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(endOfDay));
  
  const snapshot = await q.get();
  const count = snapshot.size;
  
  console.log(`[UpdateRecoveryStatus] Found ${count} postings for user ${userId} on ${dateKey}`);
  
  if (count > 0) {
    console.log(`[UpdateRecoveryStatus] Posting details for ${dateKey}:`, 
      snapshot.docs.map(doc => ({
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate()?.toISOString(),
        isRecovered: doc.data().isRecovered || false
      }))
    );
  }
  
  return count;
}

// Helper function to check if previous working day has postings
async function hasPreviousWorkingDayPosting(userId: string, currentDate: Date): Promise<boolean> {
  const prevWorkingDay = getPreviousWorkingDay(currentDate);
  const prevDateKey = getDateKey(prevWorkingDay);
  
  console.log(`[UpdateRecoveryStatus] Checking previous working day: ${prevWorkingDay.toISOString()} (${prevDateKey}) for user ${userId}`);
  
  const count = await getPostingsCountForDate(userId, prevDateKey);
  const hasPosting = count > 0;
  
  console.log(`[UpdateRecoveryStatus] Previous working day ${prevDateKey} has ${count} postings: ${hasPosting}`);
  return hasPosting;
}

/**
 * Calculate recovery status for a user
 * @param userId - User ID
 * @param currentDate - Current date (defaults to now in Asia/Seoul timezone)
 * @returns RecoveryStatus
 */
export async function calculateRecoveryStatus(userId: string, currentDate: Date = new Date()): Promise<RecoveryStatus> {
  console.log(`[UpdateRecoveryStatus] 🔄 Starting recovery status calculation for user: ${userId}`);
  console.log(`[UpdateRecoveryStatus] Current date input: ${currentDate.toISOString()}`);
  
  // Convert to Seoul timezone for consistent calculation
  const seoulDate = toSeoulDate(currentDate);
  const todayKey = getDateKey(seoulDate);
  
  console.log(`[UpdateRecoveryStatus] Seoul date: ${seoulDate.toISOString()} (${todayKey})`);
  
  // Check if previous working day has postings
  const hasPrevPosting = await hasPreviousWorkingDayPosting(userId, seoulDate);
  
  console.log(`[UpdateRecoveryStatus] Previous working day has posting: ${hasPrevPosting}`);
  
  // If previous working day has posting, no recovery needed
  if (hasPrevPosting) {
    console.log(`[UpdateRecoveryStatus] ✅ No recovery needed - previous working day has posting`);
    return 'none';
  }
  
  // Previous working day has no posting - check today's postings
  console.log(`[UpdateRecoveryStatus] Previous working day has no posting - checking today's postings`);
  const todayPostingsCount = await getPostingsCountForDate(userId, todayKey);
  
  let status: RecoveryStatus;
  if (todayPostingsCount === 0) {
    status = 'eligible';
    console.log(`[UpdateRecoveryStatus] 📝 Status: ELIGIBLE (0 posts today)`);
  } else if (todayPostingsCount === 1) {
    status = 'partial';
    console.log(`[UpdateRecoveryStatus] 📝 Status: PARTIAL (1 post today, need 1 more)`);
  } else {
    status = 'success';
    console.log(`[UpdateRecoveryStatus] 🎉 Status: SUCCESS (${todayPostingsCount} posts today - recovery complete)`);
  }
  
  console.log(`[UpdateRecoveryStatus] Final recovery status for user ${userId}: ${status}`);
  return status;
}

/**
 * Update recovery status for a user in Firestore
 * @param userId - User ID
 * @param recoveryStatus - New recovery status
 */
export async function updateUserRecoveryStatus(userId: string, recoveryStatus: RecoveryStatus): Promise<void> {
  console.log(`[UpdateRecoveryStatus] 💾 Updating recovery status for user ${userId} to: ${recoveryStatus}`);
  
  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    
    // First, get current status for comparison
    const userDoc = await userRef.get();
    const currentStatus = userDoc.data()?.recoveryStatus || 'none';
    console.log(`[UpdateRecoveryStatus] Previous status: ${currentStatus} -> New status: ${recoveryStatus}`);
    
    await userRef.update({
      recoveryStatus: recoveryStatus,
    });
    
    console.log(`[UpdateRecoveryStatus] ✅ Successfully updated recovery status for user ${userId} to ${recoveryStatus}`);
  } catch (error) {
    console.error(`[UpdateRecoveryStatus] ❌ Error updating recovery status for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Calculate and update recovery status for a user
 * @param userId - User ID
 * @param currentDate - Current date (defaults to now in Asia/Seoul timezone)
 */
export async function calculateAndUpdateRecoveryStatus(userId: string, currentDate: Date = new Date()): Promise<void> {
  console.log(`[UpdateRecoveryStatus] 🚀 Starting calculate and update recovery status for user: ${userId}`);
  
  try {
    const recoveryStatus = await calculateRecoveryStatus(userId, currentDate);
    await updateUserRecoveryStatus(userId, recoveryStatus);
    
    console.log(`[UpdateRecoveryStatus] 🎯 Complete! User ${userId} recovery status process finished with status: ${recoveryStatus}`);
  } catch (error) {
    console.error(`[UpdateRecoveryStatus] 💥 Fatal error in calculateAndUpdateRecoveryStatus for user ${userId}:`, error);
    throw error;
  }
}