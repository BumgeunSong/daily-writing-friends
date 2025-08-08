import { getOrCreateStreakInfo } from './streakUtils';
import { RecoveryStatusType } from './StreakInfo';
import { DBUpdate } from './transitionHelpers';
import {
  calculateOnStreakToEligible,
  calculateEligibleToOnStreak,
  calculateEligibleToMissed,
  calculateMissedToOnStreak,
  calculateOnStreakToOnStreak,
  calculateMidnightStreakMaintenance,
  calculateMissedStateMaintenance,
} from './transitionWrappers';

/**
 * Calculate all possible posting transitions using switch statement
 * This is the main entry point for handling user posts
 */
export async function calculatePostingTransitions(
  userId: string,
  postDate: Date,
): Promise<DBUpdate | null> {
  try {
    const { data: streakInfo } = await getOrCreateStreakInfo(userId);

    if (!streakInfo) {
      return null;
    }

    switch (streakInfo.status.type) {
      case RecoveryStatusType.ELIGIBLE:
        return await calculateEligibleToOnStreak(userId, postDate);

      case RecoveryStatusType.MISSED:
        return await calculateMissedToOnStreak(userId, postDate);

      case RecoveryStatusType.ON_STREAK:
        return await calculateOnStreakToOnStreak(userId, postDate);

      default:
        console.warn(`[StateTransition] Unknown status type: ${streakInfo.status.type}`);
        return null;
    }
  } catch (error) {
    console.error(
      `[StateTransition] Error calculating posting transitions for user ${userId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Calculate all possible midnight transitions using switch statement
 * This is the main entry point for scheduled midnight processing
 */
export async function calculateMidnightTransitions(
  userId: string,
  currentDate: Date,
): Promise<DBUpdate | null> {
  try {
    const { data: streakInfo } = await getOrCreateStreakInfo(userId);

    if (!streakInfo) {
      return null;
    }

    switch (streakInfo.status.type) {
      case RecoveryStatusType.ON_STREAK: {
        const eligibleUpdate = await calculateOnStreakToEligible(userId, currentDate);
        if (eligibleUpdate) {
          return eligibleUpdate;
        }
        // Need to check if streak should increment for maintaining onStreak
        return await calculateMidnightStreakMaintenance(userId, currentDate);
      }

      case RecoveryStatusType.ELIGIBLE: {
        const missedUpdate = await calculateEligibleToMissed(userId, currentDate);
        if (missedUpdate) {
          return missedUpdate;
        }
        break;
      }

      case RecoveryStatusType.MISSED:
        // Per PRD: ensure missed state has correct streak values
        return await calculateMissedStateMaintenance(userId);

      default:
        console.warn(`[StateTransition] Unknown status type: ${streakInfo.status.type}`);
        return null;
    }

    // No additional streak updates needed
    return null;
  } catch (error) {
    console.error(
      `[StateTransition] Error calculating midnight transitions for user ${userId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Get current user streak status for display purposes
 */
export async function getCurrentStreakStatus(userId: string) {
  try {
    const { data: streakInfo } = await getOrCreateStreakInfo(userId);
    
    if (!streakInfo) {
      return null;
    }

    return {
      status: streakInfo.status,
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      originalStreak: streakInfo.originalStreak,
      lastContributionDate: streakInfo.lastContributionDate,
    };
  } catch (error) {
    console.error(`[StreakCalculation] Error getting streak status for user ${userId}:`, error);
    return null;
  }
}