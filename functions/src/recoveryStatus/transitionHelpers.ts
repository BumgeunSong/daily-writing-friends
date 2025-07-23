import { Timestamp } from "firebase-admin/firestore";
import { StreakInfo, RecoveryStatusType } from "./StreakInfo";
import { calculateUserStreaks, calculateStreaksAfterNewPosting } from "./streakCalculations";
import { getOrCreateStreakInfo } from "./streakUtils";

export interface DBUpdate {
  userId: string;
  updates: Partial<StreakInfo> & { lastCalculated: Timestamp };
  reason: string;
}

/**
 * Helper function to add streak calculations to DB updates
 */
export async function addStreakCalculations(
  userId: string, 
  baseUpdates: Partial<StreakInfo> & { lastCalculated: Timestamp },
  isNewPosting = false
): Promise<Partial<StreakInfo> & { lastCalculated: Timestamp }> {
  try {
    const { data: currentStreakInfo } = await getOrCreateStreakInfo(userId);
    
    let streakData;
    if (isNewPosting && currentStreakInfo) {
      // Optimized calculation for new postings
      streakData = await calculateStreaksAfterNewPosting(
        userId,
        currentStreakInfo.currentStreak || 0,
        currentStreakInfo.longestStreak || 0
      );
    } else {
      // Full recalculation
      streakData = await calculateUserStreaks(userId);
    }
    
    return {
      ...baseUpdates,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      ...(streakData.lastContributionDate && {
        lastContributionDate: streakData.lastContributionDate
      })
    };
  } catch (error) {
    console.error(`[StreakCalculation] Error calculating streaks for user ${userId}:`, error);
    // Return base updates without streak data if calculation fails
    return baseUpdates;
  }
}

/**
 * Helper to validate user is in expected state
 */
export function validateUserState(
  streakInfo: StreakInfo | null, 
  expectedState: RecoveryStatusType
): boolean {
  return streakInfo?.status.type === expectedState;
}

/**
 * Helper to create base status update
 */
export function createBaseUpdate(
  userId: string,
  reason: string
): Pick<DBUpdate, 'userId' | 'reason'> & { updates: { lastCalculated: Timestamp } } {
  return {
    userId,
    reason,
    updates: {
      lastCalculated: Timestamp.now()
    }
  };
}