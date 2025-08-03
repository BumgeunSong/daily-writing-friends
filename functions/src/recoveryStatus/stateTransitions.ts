import { RecoveryStatusType } from './StreakInfo';
import { getOrCreateStreakInfo } from './streakUtils';
import {
  DBUpdate,
  validateUserState,
  createBaseUpdate,
} from './transitionHelpers';
import {
  didUserMissYesterday,
  calculateRecoveryRequirement,
  countSeoulDatePosts,
  formatSeoulDate,
  getSeoulYesterday,
  hasDeadlinePassed,
  isSeoulWorkingDay,
} from '../shared/calendar';

// Re-export DBUpdate for backward compatibility
export { DBUpdate } from './transitionHelpers';

// ===== CORE TRANSITION CALCULATORS (PURE FUNCTIONS) =====

/**
 * Pure function: Calculate onStreak → eligible transition
 */
export function calculateOnStreakToEligiblePure(
  userId: string,
  currentDate: Date,
  streakInfo: any,
  hadPostsYesterday: boolean,
): DBUpdate | null {
  if (!validateUserState(streakInfo, RecoveryStatusType.ON_STREAK)) {
    return null;
  }

  const yesterday = getSeoulYesterday(currentDate);
  
  // Per new PRD: Only check working day misses
  if (!isSeoulWorkingDay(yesterday)) {
    return null; // No state changes for non-working day misses
  }

  const missedYesterday = !hadPostsYesterday;
  if (!missedYesterday) {
    return null;
  }

  const recoveryReq = calculateRecoveryRequirement(yesterday, currentDate);
  const baseUpdate = createBaseUpdate(
    userId,
    `onStreak → eligible (missed ${recoveryReq.missedDate})`,
  );

  return {
    ...baseUpdate,
    updates: {
      ...baseUpdate.updates,
      status: {
        type: RecoveryStatusType.ELIGIBLE,
        postsRequired: recoveryReq.postsRequired,
        currentPosts: recoveryReq.currentPosts,
        deadline: recoveryReq.deadline,
        missedDate: recoveryReq.missedDate,
      },
      currentStreak: 0, // Reset immediately per new PRD
      originalStreak: streakInfo ? streakInfo.currentStreak : 0, // Preserve current streak
    },
  };
}

/**
 * Database wrapper: Calculate onStreak → eligible transition
 */
export async function calculateOnStreakToEligible(
  userId: string,
  currentDate: Date,
): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  const hadPostsYesterday = !(await didUserMissYesterday(userId, currentDate));
  
  return calculateOnStreakToEligiblePure(userId, currentDate, streakInfo, hadPostsYesterday);
}

/**
 * Calculate eligible → missed transition
 */
export async function calculateEligibleToMissed(
  userId: string,
  currentDate: Date,
): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);

  if (!validateUserState(streakInfo, RecoveryStatusType.ELIGIBLE)) {
    return null;
  }

  if (!streakInfo) {
    return null;
  }

  const status = streakInfo.status;
  if (!status.deadline || !hasDeadlinePassed(status.deadline, currentDate)) {
    return null;
  }

  const baseUpdate = createBaseUpdate(
    userId,
    `eligible → missed (deadline ${status.deadline} passed)`,
  );

  return {
    ...baseUpdate,
    updates: {
      ...baseUpdate.updates,
      status: {
        type: RecoveryStatusType.MISSED,
      },
      currentStreak: 0, // Reset per new PRD
      originalStreak: 0, // Reset per new PRD
    },
  };
}

/**
 * Pure function: Calculate eligible → onStreak transition
 */
export function calculateEligibleToOnStreakPure(
  userId: string,
  postDate: Date,
  streakInfo: any,
  todayPostCount: number,
): DBUpdate | null {
  if (!validateUserState(streakInfo, RecoveryStatusType.ELIGIBLE)) {
    return null;
  }

  if (!streakInfo) {
    return null;
  }

  const status = streakInfo.status;
  if (!status.postsRequired) {
    console.error(`[StateTransition] User ${userId} eligible status missing postsRequired`);
    return null;
  }

  // Return progress update if not yet completed
  if (todayPostCount < status.postsRequired) {
    const baseUpdate = createBaseUpdate(
      userId,
      `eligible → eligible (progress: ${todayPostCount}/${status.postsRequired})`,
    );

    return {
      ...baseUpdate,
      updates: {
        ...baseUpdate.updates,
        status: {
          ...status,
          currentPosts: todayPostCount,
        },
      },
    };
  }

  // Recovery completed - transition to onStreak with new PRD logic
  const originalStreak = streakInfo.originalStreak || 0;
  const isRecoveryOnWorkingDay = isSeoulWorkingDay(postDate);
  
  // Per new PRD:
  // - Working day recovery: currentStreak = originalStreak + 1, originalStreak = originalStreak + 1
  // - Weekend recovery: currentStreak = originalStreak, originalStreak = originalStreak (no change)
  let newCurrentStreak: number;
  let newOriginalStreak: number;
  
  if (isRecoveryOnWorkingDay) {
    newCurrentStreak = originalStreak + 1;
    newOriginalStreak = originalStreak + 1;
  } else {
    newCurrentStreak = originalStreak;
    newOriginalStreak = originalStreak;
  }
  
  const newLongestStreak = Math.max(streakInfo.longestStreak || 0, newCurrentStreak);

  const baseUpdate = createBaseUpdate(userId, `eligible → onStreak (recovery completed)`);

  return {
    ...baseUpdate,
    updates: {
      ...baseUpdate.updates,
      status: { type: RecoveryStatusType.ON_STREAK },
      currentStreak: newCurrentStreak,
      originalStreak: newOriginalStreak,
      longestStreak: newLongestStreak,
      lastContributionDate: formatSeoulDate(postDate),
    },
  };
}

/**
 * Database wrapper: Calculate eligible → onStreak transition
 */
export async function calculateEligibleToOnStreak(
  userId: string,
  postDate: Date,
): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  const todayPostCount = await countSeoulDatePosts(userId, postDate);
  
  return calculateEligibleToOnStreakPure(userId, postDate, streakInfo, todayPostCount);
}

/**
 * Calculate missed → onStreak transition
 */
export async function calculateMissedToOnStreak(
  userId: string,
  postDate: Date,
): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);

  if (!validateUserState(streakInfo, RecoveryStatusType.MISSED)) {
    return null;
  }

  const baseUpdate = createBaseUpdate(userId, 'missed → onStreak (fresh start)');

  return {
    ...baseUpdate,
    updates: {
      ...baseUpdate.updates,
      lastContributionDate: formatSeoulDate(postDate),
      status: {
        type: RecoveryStatusType.ON_STREAK,
      },
      currentStreak: 1, // Fresh start per new PRD
      originalStreak: 1, // Fresh start per new PRD
    },
  };
}

/**
 * Calculate onStreak → onStreak transition (maintain streak)
 */
export async function calculateOnStreakToOnStreak(
  userId: string,
  postDate: Date,
): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);

  if (!validateUserState(streakInfo, RecoveryStatusType.ON_STREAK)) {
    return null;
  }

  if (!streakInfo) {
    return null;
  }

  const baseUpdate = createBaseUpdate(userId, 'onStreak → onStreak (streak maintained)');

  return {
    ...baseUpdate,
    updates: {
      ...baseUpdate.updates,
      lastContributionDate: formatSeoulDate(postDate),
      status: {
        type: RecoveryStatusType.ON_STREAK,
      },
      currentStreak: streakInfo.currentStreak + 1, // Increment per new PRD
      originalStreak: streakInfo.originalStreak + 1, // Increment per new PRD
    },
  };
}

// ===== ORCHESTRATOR FUNCTIONS =====

/**
 * Calculate all possible posting transitions using switch statement
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
        // Per new PRD: ensure missed state has correct streak values
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
 * Pure function: Calculate streak maintenance for onStreak users at midnight
 */
function calculateMidnightStreakMaintenancePure(
  userId: string,
  currentDate: Date,
  streakInfo: any,
  hadPostsYesterday: boolean,
): DBUpdate | null {
  if (!streakInfo || streakInfo.status.type !== RecoveryStatusType.ON_STREAK) {
    return null;
  }

  const yesterday = getSeoulYesterday(currentDate);
  const wasYesterdayWorkingDay = isSeoulWorkingDay(yesterday);
  
  // Only increment if yesterday was a working day and user posted
  if (!wasYesterdayWorkingDay) {
    return null; // No changes needed for non-working days
  }

  if (!hadPostsYesterday) {
    return null; // This should have been caught by calculateOnStreakToEligible
  }

  const baseUpdate = createBaseUpdate(
    userId,
    `onStreak → onStreak (midnight increment for previous working day)`,
  );

  return {
    ...baseUpdate,
    updates: {
      ...baseUpdate.updates,
      currentStreak: streakInfo.currentStreak + 1,
      originalStreak: streakInfo.originalStreak + 1,
    },
  };
}

/**
 * Database wrapper: Calculate streak maintenance for onStreak users at midnight
 * Per new PRD: if user posted on previous working day, increment both streaks
 */
async function calculateMidnightStreakMaintenance(
  userId: string,
  currentDate: Date,
): Promise<DBUpdate | null> {
  try {
    const { data: streakInfo } = await getOrCreateStreakInfo(userId);
    const yesterday = getSeoulYesterday(currentDate);
    const hadPostsYesterday = await countSeoulDatePosts(userId, yesterday) > 0;
    
    return calculateMidnightStreakMaintenancePure(userId, currentDate, streakInfo, hadPostsYesterday);
  } catch (error) {
    console.error(
      `[StreakCalculation] Error calculating midnight streak maintenance for user ${userId}:`,
      error,
    );
    return null;
  }
}

/**
 * Calculate missed state maintenance at midnight 
 * Per new PRD: ensure missed state has currentStreak=0, originalStreak=0
 */
async function calculateMissedStateMaintenance(
  userId: string,
): Promise<DBUpdate | null> {
  try {
    const { data: streakInfo } = await getOrCreateStreakInfo(userId);

    if (!streakInfo || streakInfo.status.type !== RecoveryStatusType.MISSED) {
      return null;
    }

    // Check if streaks are already correct
    if (streakInfo.currentStreak === 0 && streakInfo.originalStreak === 0) {
      return null; // Already correct
    }

    const baseUpdate = createBaseUpdate(
      userId,
      `missed state maintenance (reset streaks)`,
    );

    return {
      ...baseUpdate,
      updates: {
        ...baseUpdate.updates,
        currentStreak: 0,
        originalStreak: 0,
      },
    };
  } catch (error) {
    console.error(
      `[StreakCalculation] Error calculating missed state maintenance for user ${userId}:`,
      error,
    );
    return null;
  }
}


