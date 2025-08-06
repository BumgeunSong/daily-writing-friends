import { onSchedule } from "firebase-functions/v2/scheduler";
import { calculateMidnightTransitions, DBUpdate } from "./stateTransitions";
import admin from "../shared/admin";
import { getCurrentSeoulDate } from "../shared/calendar";

// Configuration constants for batch processing
const USER_PROCESSING_BATCH_SIZE = 100; // Number of users to process in parallel
const FIRESTORE_BATCH_SIZE = 500; // Firestore batch limit for writes

interface ProcessingResult {
  updates: DBUpdate[];
  processedCount: number;
  errorCount: number;
}

interface BatchResult {
  userId: string;
  update: DBUpdate | null;
}

interface MidnightUpdateSummary {
  totalUsers: number;
  processedCount: number;
  errorCount: number;
  updatesApplied: number;
  timestamp: string;
}

/**
 * Pure function to chunk array into smaller arrays
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Pure function to process a single user's midnight transitions
 */
async function processUserTransition(userId: string, currentDate: Date): Promise<BatchResult> {
  try {
    const update = await calculateMidnightTransitions(userId, currentDate);
    return { userId, update };
  } catch (error) {
    throw new Error(`User ${userId}: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Pure function to process results from Promise.allSettled
 */
function collectBatchResults(results: PromiseSettledResult<BatchResult>[]): ProcessingResult {
  const updates: DBUpdate[] = [];
  let processedCount = 0;
  let errorCount = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { update } = result.value;
      if (update) {
        updates.push(update);
      }
      processedCount++;
    } else {
      errorCount++;
    }
  }

  return { updates, processedCount, errorCount };
}

/**
 * Process a batch of users in parallel
 */
async function processBatchOfUsers(
  userBatch: string[], 
  currentDate: Date,
  batchNumber: number,
  totalBatches: number
): Promise<ProcessingResult> {
  console.log(`[MidnightV2] Processing batch ${batchNumber}/${totalBatches}: ${userBatch.length} users`);
  
  const results = await Promise.allSettled(
    userBatch.map(userId => processUserTransition(userId, currentDate))
  );
  
  const batchResults = collectBatchResults(results);
  
  // Log errors from this batch
  for (const result of results) {
    if (result.status === 'rejected') {
      const errorMessage = result.reason?.message || result.reason;
      console.error(`[MidnightV2] Error calculating transitions:`, errorMessage);
    }
  }
  
  return batchResults;
}

/**
 * Process all users in parallel batches
 */
async function processAllUsers(userIds: string[], currentDate: Date): Promise<ProcessingResult> {
  const userBatches = chunkArray(userIds, USER_PROCESSING_BATCH_SIZE);
  
  const allUpdates: DBUpdate[] = [];
  let totalProcessed = 0;
  let totalErrors = 0;
  
  for (let i = 0; i < userBatches.length; i++) {
    const batchResults = await processBatchOfUsers(
      userBatches[i], 
      currentDate, 
      i + 1, 
      userBatches.length
    );
    
    allUpdates.push(...batchResults.updates);
    totalProcessed += batchResults.processedCount;
    totalErrors += batchResults.errorCount;
  }
  
  return {
    updates: allUpdates,
    processedCount: totalProcessed,
    errorCount: totalErrors
  };
}

/**
 * Apply DB updates using batched writes
 */
async function applyDBUpdates(updates: DBUpdate[]): Promise<void> {
  if (updates.length === 0) {
    return;
  }

  const db = admin.firestore();
  const updateBatches = chunkArray(updates, FIRESTORE_BATCH_SIZE);
  
  for (let i = 0; i < updateBatches.length; i++) {
    const batch = db.batch();
    const batchUpdates = updateBatches[i];
    
    for (const update of batchUpdates) {
      const streakInfoRef = db
        .collection('users')
        .doc(update.userId)
        .collection('streakInfo')
        .doc('current');
      
      batch.update(streakInfoRef, update.updates);
    }
    
    await batch.commit();
    console.log(`[MidnightV2] Applied batch ${i + 1}: ${batchUpdates.length} updates`);
    
    // Log individual updates for debugging
    for (const update of batchUpdates) {
      console.log(`[StateTransition] User ${update.userId}: ${update.reason}`);
    }
  }
}

/**
 * Pure function to get all user IDs
 */
async function getAllUserIds(): Promise<string[]> {
  const usersSnapshot = await admin.firestore().collection('users').get();
  return usersSnapshot.docs.map(doc => doc.id);
}

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
  _currentDate: Date = new Date()
): Promise<MidnightUpdateSummary> {
  const seoulDate = getCurrentSeoulDate();
  console.log(`[MidnightV2] Starting midnight update for 3-state recovery system at ${seoulDate.toISOString()}`);
  
  try {
    // Get all user IDs
    const userIds = await getAllUserIds();
    console.log(`[MidnightV2] Processing ${userIds.length} users`);
    
    // Process all users and collect updates
    const processingResult = await processAllUsers(userIds, seoulDate);
    
    console.log(`[MidnightV2] Calculated ${processingResult.updates.length} updates from ${processingResult.processedCount} users`);
    
    // Apply all updates in batches
    await applyDBUpdates(processingResult.updates);
    
    const summary = {
      totalUsers: userIds.length,
      processedCount: processingResult.processedCount,
      errorCount: processingResult.errorCount,
      updatesApplied: processingResult.updates.length,
      timestamp: seoulDate.toISOString()
    };
    
    console.log(`[MidnightV2] Midnight update completed: ${summary.processedCount} processed, ${summary.errorCount} errors, ${summary.updatesApplied} updates applied`);
    
    return summary;
    
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