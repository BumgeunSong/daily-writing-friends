import { Timestamp } from 'firebase-admin/firestore';

/**
 * Legacy Phase 1 types - kept for backward compatibility with backfill module
 */

/**
 * Recovery status types for the 3-state system
 */
export enum RecoveryStatusType {
  ON_STREAK = 'onStreak',
  ELIGIBLE = 'eligible',
  MISSED = 'missed',
}

/**
 * Status information for recovery system
 */
export interface RecoveryStatus {
  type: RecoveryStatusType;
  postsRequired?: number; // Only for 'eligible' status
  currentPosts?: number; // Only for 'eligible' status
  deadline?: Timestamp; // Only for 'eligible' status
  missedDate?: Timestamp; // Only for 'eligible' status
}

/**
 * Main streak information document
 * Path: users/{userId}/streakInfo/{streakInfoId}
 */
export interface StreakInfo {
  lastContributionDate: string; // YYYY-MM-DD format
  lastCalculated: Timestamp; // When this was last calculated
  status: RecoveryStatus;
  currentStreak: number; // Current consecutive writing streak (working days)
  longestStreak: number; // All-time longest streak achieved
  originalStreak: number; // Stores the streak value before transition to eligible status
}

/**
 * Recovery history record
 * Path: users/{userId}/streakInfo/{streakInfoId}/recoveryHistory/{recoveryId}
 */
export interface RecoveryHistory {
  missedDate: Timestamp;
  recoveryDate: Timestamp;
  postsRequired: number;
  postsWritten: number;
  recoveredAt: Timestamp;
}

/**
 * Helper interface for recovery requirement calculation
 */
export interface RecoveryRequirement {
  postsRequired: number;
  currentPosts: number;
  deadline: Timestamp;
  missedDate: Timestamp;
}
