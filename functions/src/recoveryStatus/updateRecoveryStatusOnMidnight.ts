import { onSchedule } from "firebase-functions/v2/scheduler";
import { toSeoulDate, getDateKey } from "../dateUtils";
import { fetchAndPrepareUsers, checkFirestoreHealth } from "./firestoreOperations";
import { processUsersInBatches, generateProcessingSummary } from "./userRecoveryProcessor";

/**
 * Core midnight update logic separated from the Firebase Functions wrapper
 * This pure function can be easily tested
 * @param currentDate - Current date for processing (defaults to now)
 * @param batchSize - Size of batches for processing users (defaults to 50)
 * @returns Processing summary
 */
export async function executeMidnightUpdate(
  currentDate: Date = new Date(),
  batchSize: number = 50
) {
  const seoulNow = toSeoulDate(currentDate);
  const todayKey = getDateKey(seoulNow);
  
  console.log(`[MidnightUpdate] Seoul midnight time: ${seoulNow.toISOString()} (${todayKey})`);
  
  // Check Firestore health before processing
  const isHealthy = await checkFirestoreHealth();
  if (!isHealthy) {
    throw new Error('Firestore connection failed health check');
  }
  
  // Fetch and prepare users for processing
  const users = await fetchAndPrepareUsers();
  
  if (users.length === 0) {
    console.log(`[MidnightUpdate] ✅ No users to update - database is empty`);
    return generateProcessingSummary([]);
  }
  
  console.log(`[MidnightUpdate] Found ${users.length} total users to check for recovery status updates`);
  
  // Process users in batches to avoid overwhelming the system
  const results = await processUsersInBatches(users, seoulNow, batchSize);
  
  // Generate and log summary
  const summary = generateProcessingSummary(results);
  
  console.log(`[MidnightUpdate] 🎯 Processing summary:`, {
    totalUsers: summary.totalUsers,
    successfulUpdates: summary.successfulUpdates,
    errors: summary.errors,
    transitions: summary.transitionCounts
  });
  
  if (summary.errors > 0) {
    console.warn(`[MidnightUpdate] ⚠️ ${summary.errors} users had processing errors:`, 
      summary.errorDetails.slice(0, 5) // Log first 5 errors
    );
  }
  
  return summary;
}

/**
 * Scheduled function that runs at midnight KST to update recovery status for all users
 * This function checks users who have 'partial' or 'eligible' status and updates them to 'none'
 * if they didn't complete the recovery requirements by the end of the recovery day
 */
export const updateRecoveryStatusOnMidnight = onSchedule(
  {
    schedule: "0 0 * * *", // Run at 00:00 KST every day
    timeZone: "Asia/Seoul",
  },
  async (): Promise<void> => {
    console.log(`[MidnightUpdate] 🌙 Starting midnight recovery status update at ${new Date().toISOString()}`);
    
    try {
      const summary = await executeMidnightUpdate();
      
      console.log(`[MidnightUpdate] 🎉 Midnight recovery status update completed successfully`);
      console.log(`[MidnightUpdate] Final summary: ${summary.successfulUpdates}/${summary.totalUsers} users processed, ${summary.errors} errors`);
      
    } catch (error) {
      console.error(`[MidnightUpdate] 💥 Fatal error in midnight recovery status update:`, error);
      throw error;
    }
  }
);