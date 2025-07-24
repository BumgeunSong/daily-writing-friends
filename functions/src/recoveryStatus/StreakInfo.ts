import { Timestamp } from "firebase-admin/firestore";

/**
 * Recovery status types for the 3-state system
 */
export enum RecoveryStatusType {
  ON_STREAK = 'onStreak',
  ELIGIBLE = 'eligible', 
  MISSED = 'missed'
}

/**
 * Status information for recovery system
 */
export interface RecoveryStatus {
  type: RecoveryStatusType;
  postsRequired?: number;    // Only for 'eligible' status
  currentPosts?: number;     // Only for 'eligible' status  
  deadline?: string;         // Only for 'eligible' status (YYYY-MM-DD format)
  missedDate?: string;       // Only for 'eligible' status (YYYY-MM-DD format)
}

/**
 * Main streak information document
 * Path: users/{userId}/streakInfo/{streakInfoId}
 */
export interface StreakInfo {
  lastContributionDate: string;  // YYYY-MM-DD format
  lastCalculated: Timestamp;     // When this was last calculated
  status: RecoveryStatus;
  currentStreak: number;         // Current consecutive writing streak (working days)
  longestStreak: number;         // All-time longest streak achieved
}

/**
 * Recovery history record
 * Path: streakInfo/{userId}/recoveryHistory/{recoveryId}  
 */
export interface RecoveryHistory {
  missedDate: string;      // YYYY-MM-DD format
  recoveryDate: string;    // YYYY-MM-DD format
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
  deadline: string;        // YYYY-MM-DD format
  missedDate: string;      // YYYY-MM-DD format
}