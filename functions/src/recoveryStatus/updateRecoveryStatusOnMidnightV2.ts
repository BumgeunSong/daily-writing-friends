import { onSchedule } from "firebase-functions/v2/scheduler";
import admin from "../admin";
import { toSeoulDate } from "../dateUtils";
import { processMidnightTransitions } from "./stateTransitions";

/**
 * Core midnight update logic for the new 3-state recovery system
 * This function handles:
 * - onStreak → eligible (when user missed a working day)
 * - eligible → missed (when recovery deadline passes)
 * - maintains missed status (until user posts to start fresh)
 * @param currentDate - Current date for processing (defaults to now)
 * @returns Processing summary
 */
export async function executeMidnightUpdateV2(
  currentDate: Date = new Date()
) {
  const seoulDate = toSeoulDate(currentDate);
  console.log(`[MidnightV2] Starting midnight update for 3-state recovery system at ${seoulDate.toISOString()}`);
  
  try {
    // Get all users who have streak info (they've used the system)
    const usersSnapshot = await admin.firestore().collection('users').get();
    const userIds = usersSnapshot.docs.map(doc => doc.id);
    
    console.log(`[MidnightV2] Processing ${userIds.length} users`);
    
    let processedCount = 0;
    let errorCount = 0;
    
    // Process each user's state transitions
    for (const userId of userIds) {
      try {
        await processMidnightTransitions(userId, seoulDate);
        processedCount++;
      } catch (error) {
        console.error(`[MidnightV2] Error processing user ${userId}:`, error);
        errorCount++;
      }
    }
    
    console.log(`[MidnightV2] Midnight update completed: ${processedCount} processed, ${errorCount} errors`);
    
    return {
      totalUsers: userIds.length,
      processedCount,
      errorCount,
      timestamp: seoulDate.toISOString()
    };
    
  } catch (error) {
    console.error('Error in midnight recovery update:', error);
    throw error;
  }
}

/**
 * Scheduled function that runs at midnight KST to update recovery status
 * for the new 3-state system (onStreak, eligible, missed)
 */
export const updateRecoveryStatusOnMidnightV2 = onSchedule(
  {
    schedule: "0 0 * * *", // Run at 00:00 KST every day
    timeZone: "Asia/Seoul",
  },
  async (): Promise<void> => {
    console.log(`[MidnightV2] Starting midnight recovery status update at ${new Date().toISOString()}`);
    
    try {
      await executeMidnightUpdateV2();
      console.log(`[MidnightV2] Midnight recovery status update completed successfully`);
      
    } catch (error) {
      console.error(`[MidnightV2] Fatal error in midnight recovery status update:`, error);
      throw error;
    }
  }
);