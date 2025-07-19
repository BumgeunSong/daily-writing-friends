import admin from "../admin";
import { 
  toSeoulDate, 
  getPreviousWorkingDay, 
  getDateKey 
} from "../dateUtils";
import { RecoveryStatus } from "../types/User";

// Helper function to get postings count for a specific date
async function getPostingsCountForDate(userId: string, dateKey: string): Promise<number> {
  console.log(`[UpdateRecoveryStatus] Getting postings count for user ${userId} on date ${dateKey}`);
  
  const postingsRef = admin.firestore().collection('users').doc(userId).collection('postings');
  const startOfDay = new Date(dateKey + 'T00:00:00+09:00');
  const startOfNextDay = new Date(new Date(startOfDay).getTime() + 24 * 60 * 60 * 1000);
  
  console.log(`[UpdateRecoveryStatus] Query range: ${startOfDay.toISOString()} to ${startOfNextDay.toISOString()} (exclusive)`);
  
  const q = postingsRef
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
    .where('createdAt', '<', admin.firestore.Timestamp.fromDate(startOfNextDay));
  
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

/**
 * Optimized function to get postings count for multiple dates in a single query
 * This reduces Firestore round trips from N queries to 1 query per user
 * @param userId - User ID
 * @param dateKeys - Array of date keys in YYYY-MM-DD format
 * @returns Map of dateKey -> posting count
 */
async function getPostingsCountForDateRange(userId: string, dateKeys: string[]): Promise<Map<string, number>> {
  if (dateKeys.length === 0) {
    return new Map();
  }

  console.log(`[UpdateRecoveryStatus] Getting postings count for user ${userId} for dates: ${dateKeys.join(', ')}`);
  
  // Find the earliest and latest dates to create a range query
  const sortedDates = dateKeys.sort();
  const earliestDate = sortedDates[0];
  const latestDate = sortedDates[sortedDates.length - 1];
  
  const startOfRange = new Date(earliestDate + 'T00:00:00+09:00');
  const endOfRange = new Date(new Date(latestDate + 'T00:00:00+09:00').getTime() + 24 * 60 * 60 * 1000);
  
  console.log(`[UpdateRecoveryStatus] Range query: ${startOfRange.toISOString()} to ${endOfRange.toISOString()} (exclusive)`);
  
  const postingsRef = admin.firestore().collection('users').doc(userId).collection('postings');
  const q = postingsRef
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfRange))
    .where('createdAt', '<', admin.firestore.Timestamp.fromDate(endOfRange));
  
  const snapshot = await q.get();
  
  // Initialize count map with 0 for all requested dates
  const countMap = new Map<string, number>();
  dateKeys.forEach(dateKey => countMap.set(dateKey, 0));
  
  // Count postings by date
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate();
    if (createdAt) {
      const dateKey = getDateKey(createdAt);
      if (countMap.has(dateKey)) {
        countMap.set(dateKey, (countMap.get(dateKey) || 0) + 1);
      }
    }
  });
  
  console.log(`[UpdateRecoveryStatus] Batch result for user ${userId}:`, 
    Array.from(countMap.entries()).map(([date, count]) => `${date}: ${count} posts`).join(', ')
  );
  
  // Log detailed posting information if any postings found
  if (snapshot.size > 0) {
    const postingDetails = snapshot.docs.map(doc => ({
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate()?.toISOString(),
      dateKey: getDateKey(doc.data().createdAt?.toDate()),
      isRecovered: doc.data().isRecovered || false
    }));
    console.log(`[UpdateRecoveryStatus] Posting details:`, postingDetails);
  }
  
  return countMap;
}

// Helper function to check if previous working day has postings
// Now uses batch query for better performance
async function hasPreviousWorkingDayPosting(userId: string, currentDate: Date): Promise<boolean> {
  const prevWorkingDay = getPreviousWorkingDay(currentDate);
  const prevDateKey = getDateKey(prevWorkingDay);
  
  console.log(`[UpdateRecoveryStatus] Checking previous working day: ${prevWorkingDay.toISOString()} (${prevDateKey}) for user ${userId}`);
  
  const countMap = await getPostingsCountForDateRange(userId, [prevDateKey]);
  const count = countMap.get(prevDateKey) || 0;
  const hasPosting = count > 0;
  
  console.log(`[UpdateRecoveryStatus] Previous working day ${prevDateKey} has ${count} postings: ${hasPosting}`);
  return hasPosting;
}

// Helper function to check if user missed multiple consecutive working days
// Now uses batch query for better performance
async function hasMissedMultipleWorkingDays(userId: string, currentDate: Date): Promise<boolean> {
  const seoulDate = toSeoulDate(currentDate);
  const prevWorkingDay = getPreviousWorkingDay(seoulDate);
  const prevPrevWorkingDay = getPreviousWorkingDay(prevWorkingDay);
  
  const prevDateKey = getDateKey(prevWorkingDay);
  const prevPrevDateKey = getDateKey(prevPrevWorkingDay);
  
  console.log(`[UpdateRecoveryStatus] Checking consecutive misses for user ${userId}`);
  console.log(`[UpdateRecoveryStatus] Previous working day: ${prevDateKey}`);
  console.log(`[UpdateRecoveryStatus] Day before previous: ${prevPrevDateKey}`);
  
  // Check if both previous working day and the one before it have no postings using batch query
  const countMap = await getPostingsCountForDateRange(userId, [prevDateKey, prevPrevDateKey]);
  const prevDayCount = countMap.get(prevDateKey) || 0;
  const prevPrevDayCount = countMap.get(prevPrevDateKey) || 0;
  
  const missedMultiple = prevDayCount === 0 && prevPrevDayCount === 0;
  
  console.log(`[UpdateRecoveryStatus] User ${userId} consecutive miss check:`);
  console.log(`[UpdateRecoveryStatus] - ${prevPrevDateKey}: ${prevPrevDayCount} posts`);
  console.log(`[UpdateRecoveryStatus] - ${prevDateKey}: ${prevDayCount} posts`);
  console.log(`[UpdateRecoveryStatus] - Missed multiple consecutive days: ${missedMultiple}`);
  
  return missedMultiple;
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
  
  // Previous working day has no posting - check if user missed multiple consecutive days
  const missedMultiple = await hasMissedMultipleWorkingDays(userId, seoulDate);
  
  if (missedMultiple) {
    console.log(`[UpdateRecoveryStatus] ❌ User missed multiple consecutive working days - no recovery allowed`);
    return 'none';
  }
  
  // Previous working day has no posting, but only 1 day missed - check today's postings for recovery
  console.log(`[UpdateRecoveryStatus] Previous working day has no posting (single miss) - checking today's postings for recovery`);
  const todayPostingsCount = await getPostingsCountForDate(userId, todayKey);
  
  let status: RecoveryStatus;
  if (todayPostingsCount === 0) {
    status = 'eligible';
    console.log(`[UpdateRecoveryStatus] 📝 Status: ELIGIBLE (0 posts today, can start recovery)`);
  } else if (todayPostingsCount === 1) {
    status = 'partial';
    console.log(`[UpdateRecoveryStatus] 📝 Status: PARTIAL (1 post today, need 1 more for recovery)`);
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