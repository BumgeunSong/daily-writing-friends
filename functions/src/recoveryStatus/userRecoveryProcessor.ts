import { calculateRecoveryStatus, updateUserRecoveryStatus } from "./updateRecoveryStatus";
import {
  UserRecoveryData,
  determineNewRecoveryStatus,
  shouldUpdateStatus,
  createStatusTransitionLog,
  StatusTransitionLog
} from "./midnightUpdateHelpers";

/**
 * Result of processing a single user's recovery status
 */
export interface UserProcessingResult {
  userId: string;
  success: boolean;
  transitionLog: StatusTransitionLog;
  error?: Error;
}

/**
 * Process a single user's recovery status update
 * @param userData - User recovery data
 * @param currentDate - Current date for status calculation
 * @returns Processing result
 */
export async function processUserRecoveryStatus(
  userData: UserRecoveryData,
  currentDate: Date
): Promise<UserProcessingResult> {
  const { userId, currentStatus } = userData;
  
  try {
    console.log(`[UserProcessor] Processing user ${userId} with status '${currentStatus}'`);
    
    // Calculate the current recovery status based on actual posting data
    const calculatedStatus = await calculateRecoveryStatus(userId, currentDate);
    
    console.log(`[UserProcessor] User ${userId}: current='${currentStatus}', calculated='${calculatedStatus}'`);
    
    // Determine new status using pure function
    const newStatus = determineNewRecoveryStatus(currentStatus, calculatedStatus);
    
    // Create transition log
    const transitionLog = createStatusTransitionLog(
      userId,
      currentStatus,
      newStatus,
      calculatedStatus
    );
    
    console.log(`[UserProcessor] ${transitionLog.message}`);
    
    // Update status if needed
    if (shouldUpdateStatus(currentStatus, newStatus)) {
      await updateUserRecoveryStatus(userId, newStatus);
      console.log(`[UserProcessor] ✅ Updated user ${userId} from '${currentStatus}' to '${newStatus}'`);
    } else {
      console.log(`[UserProcessor] ✨ User ${userId} status unchanged: '${currentStatus}'`);
    }
    
    return {
      userId,
      success: true,
      transitionLog
    };
    
  } catch (error) {
    console.error(`[UserProcessor] ❌ Error processing user ${userId}:`, error);
    
    const transitionLog = createStatusTransitionLog(
      userId,
      currentStatus,
      currentStatus, // No change due to error
      currentStatus  // Can't calculate due to error
    );
    
    return {
      userId,
      success: false,
      transitionLog,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Process multiple users in parallel with error isolation
 * @param users - Array of users to process
 * @param currentDate - Current date for status calculation
 * @returns Array of processing results
 */
export async function processUsersInParallel(
  users: UserRecoveryData[],
  currentDate: Date
): Promise<UserProcessingResult[]> {
  console.log(`[UserProcessor] Processing ${users.length} users in parallel`);
  
  const processingPromises = users.map(userData =>
    processUserRecoveryStatus(userData, currentDate)
  );
  
  const results = await Promise.all(processingPromises);
  
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;
  
  console.log(`[UserProcessor] Processing complete: ${successCount} success, ${errorCount} errors`);
  
  return results;
}

/**
 * Process users in batches to avoid overwhelming the system
 * @param users - Array of users to process
 * @param currentDate - Current date for status calculation
 * @param batchSize - Size of each batch (default: 50)
 * @returns Array of processing results
 */
export async function processUsersInBatches(
  users: UserRecoveryData[],
  currentDate: Date,
  batchSize: number = 50
): Promise<UserProcessingResult[]> {
  console.log(`[UserProcessor] Processing ${users.length} users in batches of ${batchSize}`);
  
  const allResults: UserProcessingResult[] = [];
  
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    console.log(`[UserProcessor] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}`);
    
    const batchResults = await processUsersInParallel(batch, currentDate);
    allResults.push(...batchResults);
  }
  
  return allResults;
}

/**
 * Generate summary of processing results
 * @param results - Array of processing results
 * @returns Summary object
 */
export interface ProcessingSummary {
  totalUsers: number;
  successfulUpdates: number;
  errors: number;
  transitionCounts: Record<string, number>;
  errorDetails: Array<{ userId: string; error: string }>;
}

export function generateProcessingSummary(results: UserProcessingResult[]): ProcessingSummary {
  const summary: ProcessingSummary = {
    totalUsers: results.length,
    successfulUpdates: 0,
    errors: 0,
    transitionCounts: {
      reset: 0,
      success: 0,
      transition: 0,
      no_change: 0
    },
    errorDetails: []
  };
  
  for (const result of results) {
    if (result.success) {
      summary.successfulUpdates++;
      summary.transitionCounts[result.transitionLog.transitionType]++;
    } else {
      summary.errors++;
      summary.errorDetails.push({
        userId: result.userId,
        error: result.error?.message || 'Unknown error'
      });
    }
  }
  
  return summary;
}