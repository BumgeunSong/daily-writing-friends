import { onRequest } from "firebase-functions/v2/https";
import admin from "../shared/admin";
import { calculateUserStreaks } from "../recoveryStatus/streakCalculations";
import { getOrCreateStreakInfo } from "../recoveryStatus/streakUtils";

interface MigrationResult {
  totalUsers: number;
  processedUsers: number;
  updatedUsers: number;
  skippedUsers: number;
  errorUsers: number;
  errors: Array<{ userId: string; error: string }>;
  executionTimeMs: number;
}

interface UserStreakUpdate {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastContributionDate: string | null;
  hasPostings: boolean;
}

/**
 * Batch process users to initialize their streak data
 */
async function processBatchUsers(
  userIds: string[], 
  batchNumber: number, 
  totalBatches: number
): Promise<{
  updates: UserStreakUpdate[];
  errors: Array<{ userId: string; error: string }>;
}> {
  console.log(`[StreakMigration] Processing batch ${batchNumber}/${totalBatches}: ${userIds.length} users`);
  
  const updates: UserStreakUpdate[] = [];
  const errors: Array<{ userId: string; error: string }> = [];
  
  // Process users in parallel within the batch
  const results = await Promise.allSettled(
    userIds.map(async (userId) => {
      try {
        // Check if user already has accurate streak data
        const { data: existingStreakInfo } = await getOrCreateStreakInfo(userId);
        
        // Skip if already has non-zero streaks (likely already calculated)
        if (existingStreakInfo && 
            (existingStreakInfo.currentStreak > 0 || existingStreakInfo.longestStreak > 0)) {
          return { userId, skipped: true };
        }
        
        // Calculate accurate streaks from historical data
        const streakData = await calculateUserStreaks(userId);
        
        return {
          userId,
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          lastContributionDate: streakData.lastContributionDate,
          hasPostings: streakData.currentStreak > 0 || streakData.longestStreak > 0,
          skipped: false
        };
        
      } catch (error) {
        throw new Error(`User ${userId}: ${error instanceof Error ? error.message : error}`);
      }
    })
  );
  
  // Collect results and errors
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const userId = userIds[i];
    
    if (result.status === 'fulfilled') {
      if (!result.value.skipped) {
        updates.push(result.value as UserStreakUpdate);
      }
    } else {
      errors.push({
        userId,
        error: result.reason?.message || result.reason
      });
    }
  }
  
  return { updates, errors };
}

/**
 * Apply streak updates to Firestore using batched writes
 */
async function applyStreakUpdates(updates: UserStreakUpdate[]): Promise<void> {
  if (updates.length === 0) {
    console.log('[StreakMigration] No updates to apply');
    return;
  }
  
  const db = admin.firestore();
  const batchSize = 500; // Firestore batch limit
  
  // Split updates into batches
  for (let i = 0; i < updates.length; i += batchSize) {
    const batchUpdates = updates.slice(i, i + batchSize);
    const batch = db.batch();
    
    for (const update of batchUpdates) {
      const streakInfoRef = db
        .collection('users')
        .doc(update.userId)
        .collection('streakInfo')
        .doc('current');
      
      const updateData: any = {
        currentStreak: update.currentStreak,
        longestStreak: update.longestStreak,
        lastCalculated: admin.firestore.Timestamp.now()
      };
      
      // Only update lastContributionDate if user has postings
      if (update.lastContributionDate) {
        updateData.lastContributionDate = update.lastContributionDate;
      }
      
      batch.update(streakInfoRef, updateData);
    }
    
    await batch.commit();
    console.log(`[StreakMigration] Applied batch ${Math.floor(i / batchSize) + 1}: ${batchUpdates.length} updates`);
  }
}

/**
 * Get all user IDs from the users collection
 */
async function getAllUserIds(): Promise<string[]> {
  const usersSnapshot = await admin.firestore().collection('users').get();
  return usersSnapshot.docs.map(doc => doc.id);
}

/**
 * Main migration logic to initialize user streaks
 */
export async function executeStreakMigration(options: {
  dryRun?: boolean;
  maxUsers?: number;
} = {}): Promise<MigrationResult> {
  const { dryRun = false, maxUsers } = options;
  const startTime = Date.now();
  console.log(`[StreakMigration] Starting user streak initialization migration... (dryRun: ${dryRun})`);
  
  try {
    // Get all user IDs
    let userIds = await getAllUserIds();
    
    // Limit users if maxUsers is specified
    if (maxUsers && maxUsers > 0) {
      userIds = userIds.slice(0, maxUsers);
      console.log(`[StreakMigration] Limited to first ${maxUsers} users for testing`);
    }
    
    console.log(`[StreakMigration] Found ${userIds.length} users to process`);
    
    if (userIds.length === 0) {
      return {
        totalUsers: 0,
        processedUsers: 0,
        updatedUsers: 0,
        skippedUsers: 0,
        errorUsers: 0,
        errors: [],
        executionTimeMs: Date.now() - startTime
      };
    }
    
    // Process users in batches of 50 to avoid overwhelming the system
    const batchSize = 50;
    const userBatches = [];
    for (let i = 0; i < userIds.length; i += batchSize) {
      userBatches.push(userIds.slice(i, i + batchSize));
    }
    
    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    const allErrors: Array<{ userId: string; error: string }> = [];
    const allUpdates: UserStreakUpdate[] = [];
    
    // Process each batch sequentially to control load
    for (let i = 0; i < userBatches.length; i++) {
      const { updates, errors } = await processBatchUsers(
        userBatches[i], 
        i + 1, 
        userBatches.length
      );
      
      allUpdates.push(...updates);
      allErrors.push(...errors);
      totalProcessed += userBatches[i].length;
      
      // Apply updates for this batch (skip if dry run)
      if (!dryRun) {
        await applyStreakUpdates(updates);
      } else {
        console.log(`[StreakMigration] DRY RUN: Would apply ${updates.length} updates`);
      }
      totalUpdated += updates.length;
      totalSkipped += userBatches[i].length - updates.length - errors.length;
      
      // Log progress
      console.log(`[StreakMigration] Batch ${i + 1} complete: ${updates.length} updated, ${errors.length} errors`);
    }
    
    const result: MigrationResult = {
      totalUsers: userIds.length,
      processedUsers: totalProcessed,
      updatedUsers: totalUpdated,
      skippedUsers: totalSkipped,
      errorUsers: allErrors.length,
      errors: allErrors,
      executionTimeMs: Date.now() - startTime
    };
    
    console.log('[StreakMigration] Migration completed successfully:', {
      totalUsers: result.totalUsers,
      processedUsers: result.processedUsers,
      updatedUsers: result.updatedUsers,
      skippedUsers: result.skippedUsers,
      errorUsers: result.errorUsers,
      executionTimeMs: result.executionTimeMs
    });
    
    return result;
    
  } catch (error) {
    console.error('[StreakMigration] Fatal error during migration:', error);
    throw error;
  }
}

/**
 * HTTP Cloud Function to initialize user streaks
 * Call via: POST https://your-project.cloudfunctions.net/initializeUserStreaks
 * 
 * Optional body parameters:
 * - dryRun: boolean (default: false) - Only calculate, don't update
 * - maxUsers: number (default: unlimited) - Limit number of users to process
 */
export const initializeUserStreaks = onRequest(
  {
    timeoutSeconds: 540, // 9 minutes (max for HTTP functions)
    memory: "1GiB"
  },
  async (req, res) => {
    console.log('[StreakMigration] HTTP function called with method:', req.method);
    
    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ 
        error: 'Method not allowed', 
        message: 'Use POST to execute migration' 
      });
      return;
    }
    
    try {
      // Parse request body for options
      const { dryRun = false, maxUsers } = req.body || {};
      
      console.log('[StreakMigration] Executing with options:', { dryRun, maxUsers });
      
      const result = await executeStreakMigration({ dryRun, maxUsers });
      
      res.status(200).json({
        success: true,
        message: 'User streak migration completed successfully',
        result: result
      });
      
    } catch (error) {
      console.error('[StreakMigration] HTTP function error:', error);
      res.status(500).json({
        success: false,
        error: 'Migration failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);