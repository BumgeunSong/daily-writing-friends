import { Timestamp } from 'firebase-admin/firestore';
import { RecoveryHistory, RecoveryStatus, RecoveryRequirement } from './StreakInfo';

/**
 * Create a RecoveryHistory record for successful recovery
 */
export function createRecoveryHistory(
  statusOrRequirement: RecoveryStatus | RecoveryRequirement,
  recoveryDate: Date,
  postsWritten: number,
): RecoveryHistory {
  return {
    missedDate: statusOrRequirement.missedDate!, // Safe to use ! because we validated it exists
    recoveryDate: Timestamp.fromDate(recoveryDate),
    postsRequired: statusOrRequirement.postsRequired!,
    postsWritten,
    recoveredAt: Timestamp.now(),
  };
}

/**
 * Update longest streak if current streak exceeds previous maximum
 * Per REQ-018: Update longestStreak whenever currentStreak exceeds its previous max
 */
export function updateLongestStreak(
  currentLongestStreak: number | undefined,
  newCurrentStreak: number,
): number {
  const previousMax = currentLongestStreak || 0;
  return Math.max(previousMax, newCurrentStreak);
}

/**
 * Check if a recovery deadline has passed based on current time
 */
export function isRecoveryDeadlinePassed(
  deadline: Timestamp,
  currentDate: Date,
): boolean {
  return currentDate.getTime() > deadline.toDate().getTime();
}

/**
 * Calculate the posts still needed to complete recovery
 */
export function calculatePostsNeeded(
  postsRequired: number,
  currentPosts: number,
): number {
  return Math.max(0, postsRequired - currentPosts);
}

/**
 * Determine if a recovery attempt is on track to succeed
 */
export function isRecoveryOnTrack(
  postsRequired: number,
  currentPosts: number,
  deadline: Timestamp,
  currentDate: Date,
): boolean {
  const postsNeeded = calculatePostsNeeded(postsRequired, currentPosts);
  const timeRemaining = deadline.toDate().getTime() - currentDate.getTime();
  
  // If deadline has passed, recovery is not on track
  if (timeRemaining <= 0) {
    return false;
  }
  
  // If all posts are completed, recovery is on track
  return postsNeeded === 0;
}