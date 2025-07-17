import { onSchedule } from "firebase-functions/v2/scheduler";
import admin from "../admin";
import { calculateRecoveryStatus, updateUserRecoveryStatus } from "./updateRecoveryStatus";
import { RecoveryStatus } from "../types/User";
import { toSeoulDate, getDateKey } from "../dateUtils";

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
      // Get current date in Seoul timezone
      const seoulNow = toSeoulDate(new Date());
      const todayKey = getDateKey(seoulNow);
      
      console.log(`[MidnightUpdate] Seoul midnight time: ${seoulNow.toISOString()} (${todayKey})`);
      
      // Get all users to check their recovery status
      // We need to check:
      // 1. Users with 'partial' or 'eligible' who might need to be reset to 'none'
      // 2. Users with 'none' or 'success' who might need to become 'eligible' (if they missed yesterday)
      const usersRef = admin.firestore().collection('users');
      
      // Get all users (we need to check all for potential 'none' -> 'eligible' transitions)
      const allUsersSnapshot = await usersRef.get();
      const usersToCheck = allUsersSnapshot.docs;
      
      console.log(`[MidnightUpdate] Found ${usersToCheck.length} total users to check for recovery status updates`);
      
      if (usersToCheck.length === 0) {
        console.log(`[MidnightUpdate] ✅ No users to update - all users have proper recovery status`);
        return;
      }
      
      // Process each user
      const updatePromises = usersToCheck.map(async (userDoc) => {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const currentStatus = (userData?.recoveryStatus as RecoveryStatus) || 'none';
        
        console.log(`[MidnightUpdate] Processing user ${userId} with status '${currentStatus}'`);
        
        try {
          // Calculate the current recovery status based on actual posting data
          const calculatedStatus = await calculateRecoveryStatus(userId, seoulNow);
          
          console.log(`[MidnightUpdate] User ${userId}: current='${currentStatus}', calculated='${calculatedStatus}'`);
          
          // Handle status transitions at midnight:
          let newStatus: RecoveryStatus;
          
          if (currentStatus === 'partial' || currentStatus === 'eligible') {
            // Users who had recovery opportunity but didn't complete -> 'none'
            if (calculatedStatus !== 'success') {
              newStatus = 'none';
              console.log(`[MidnightUpdate] 🔄 User ${userId} failed to complete recovery - resetting to 'none'`);
            } else {
              newStatus = calculatedStatus; // Keep 'success' status
              console.log(`[MidnightUpdate] 🎉 User ${userId} completed recovery successfully`);
            }
          } else {
            // For users with 'none' or 'success', use the calculated status
            // This handles 'none' -> 'eligible' when they miss a working day
            newStatus = calculatedStatus;
            if (currentStatus !== newStatus) {
              console.log(`[MidnightUpdate] 📝 User ${userId} status transition: '${currentStatus}' -> '${newStatus}'`);
            }
          }
          
          // Update status if it changed
          if (newStatus !== currentStatus) {
            await updateUserRecoveryStatus(userId, newStatus);
            console.log(`[MidnightUpdate] ✅ Updated user ${userId} from '${currentStatus}' to '${newStatus}'`);
          } else {
            console.log(`[MidnightUpdate] ✨ User ${userId} status unchanged: '${currentStatus}'`);
          }
          
        } catch (error) {
          console.error(`[MidnightUpdate] ❌ Error processing user ${userId}:`, error);
        }
      });
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      console.log(`[MidnightUpdate] 🎯 Midnight recovery status update completed for ${usersToCheck.length} users`);
      
    } catch (error) {
      console.error(`[MidnightUpdate] 💥 Fatal error in midnight recovery status update:`, error);
      throw error;
    }
  }
);