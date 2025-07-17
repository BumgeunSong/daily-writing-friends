import { DocumentSnapshot } from "firebase-admin/firestore";
import { RecoveryStatus } from "../types/User";

/**
 * Pure function to extract user ID and recovery status from a Firestore document
 * @param userDoc - Firestore document snapshot
 * @returns User data with ID and status
 */
export interface UserRecoveryData {
  userId: string;
  currentStatus: RecoveryStatus;
}

export function extractUserRecoveryData(userDoc: DocumentSnapshot): UserRecoveryData {
  const userId = userDoc.id;
  const userData = userDoc.data();
  const currentStatus = (userData?.recoveryStatus as RecoveryStatus) || 'none';
  
  return {
    userId,
    currentStatus
  };
}

/**
 * Pure function to determine the new recovery status based on current and calculated status
 * This implements the midnight transition logic
 * @param currentStatus - Current recovery status
 * @param calculatedStatus - Status calculated from posting data
 * @returns New recovery status
 */
export function determineNewRecoveryStatus(
  currentStatus: RecoveryStatus,
  calculatedStatus: RecoveryStatus
): RecoveryStatus {
  // Handle status transitions at midnight
  if (currentStatus === 'partial' || currentStatus === 'eligible') {
    // Users who had recovery opportunity but didn't complete -> 'none'
    if (calculatedStatus !== 'success') {
      return 'none';
    } else {
      return calculatedStatus; // Keep 'success' status
    }
  } else {
    // For users with 'none' or 'success', use the calculated status
    // This handles 'none' -> 'eligible' when they miss a working day
    return calculatedStatus;
  }
}

/**
 * Pure function to determine if a status update is needed
 * @param currentStatus - Current recovery status
 * @param newStatus - New recovery status
 * @returns true if update is needed
 */
export function shouldUpdateStatus(
  currentStatus: RecoveryStatus,
  newStatus: RecoveryStatus
): boolean {
  return newStatus !== currentStatus;
}

/**
 * Pure function to create transition log message
 * @param userId - User ID
 * @param currentStatus - Current recovery status
 * @param newStatus - New recovery status
 * @param calculatedStatus - Status calculated from posting data
 * @returns Log message object
 */
export interface StatusTransitionLog {
  userId: string;
  currentStatus: RecoveryStatus;
  newStatus: RecoveryStatus;
  calculatedStatus: RecoveryStatus;
  transitionType: 'reset' | 'success' | 'transition' | 'no_change';
  message: string;
}

export function createStatusTransitionLog(
  userId: string,
  currentStatus: RecoveryStatus,
  newStatus: RecoveryStatus,
  calculatedStatus: RecoveryStatus
): StatusTransitionLog {
  let transitionType: StatusTransitionLog['transitionType'];
  let message: string;

  if (currentStatus === newStatus) {
    transitionType = 'no_change';
    message = `User ${userId} status unchanged: '${currentStatus}'`;
  } else if ((currentStatus === 'partial' || currentStatus === 'eligible') && newStatus === 'none') {
    transitionType = 'reset';
    message = `User ${userId} failed to complete recovery - resetting to 'none'`;
  } else if (newStatus === 'success') {
    transitionType = 'success';
    message = `User ${userId} completed recovery successfully`;
  } else {
    transitionType = 'transition';
    message = `User ${userId} status transition: '${currentStatus}' -> '${newStatus}'`;
  }

  return {
    userId,
    currentStatus,
    newStatus,
    calculatedStatus,
    transitionType,
    message
  };
}

/**
 * Pure function to validate user recovery data
 * @param userData - User recovery data
 * @returns true if valid
 */
export function isValidUserRecoveryData(userData: UserRecoveryData): boolean {
  return (
    typeof userData.userId === 'string' &&
    userData.userId.length > 0 &&
    ['none', 'eligible', 'partial', 'success'].includes(userData.currentStatus)
  );
}

/**
 * Pure function to filter users that need processing
 * This can be used to optimize processing by filtering out users that definitely don't need updates
 * @param users - Array of user recovery data
 * @returns Filtered array of users that might need updates
 */
export function filterUsersForProcessing(users: UserRecoveryData[]): UserRecoveryData[] {
  return users.filter(isValidUserRecoveryData);
}

/**
 * Pure function to batch users for parallel processing
 * @param users - Array of users to process
 * @param batchSize - Size of each batch
 * @returns Array of batches
 */
export function batchUsers<T>(users: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < users.length; i += batchSize) {
    batches.push(users.slice(i, i + batchSize));
  }
  return batches;
}