import {
  formatSeoulDate,
  didUserMissYesterday,
  calculateRecoveryRequirement,
  countSeoulDatePosts,
  hasDeadlinePassed,
  getSeoulYesterday,
  isSeoulWorkingDay,
} from '../shared/calendar';
import { getOrCreateStreakInfo } from './streakUtils';
import { RecoveryStatusType } from './StreakInfo';
import {
  DBUpdate,
  addStreakCalculations,
  validateUserState,
  createBaseUpdate,
} from './transitionHelpers';
import { calculateUserStreaks } from './streakCalculations';

// Re-export DBUpdate for backward compatibility
export { DBUpdate } from './transitionHelpers';

// ===== CORE TRANSITION CALCULATORS (PURE FUNCTIONS) =====

/**
 * Calculate onStreak → eligible transition
 */
export async function calculateOnStreakToEligible(
  userId: string,
  currentDate: Date,
): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);

  if (!validateUserState(streakInfo, RecoveryStatusType.ON_STREAK)) {
    return null;
  }

  const missedYesterday = await didUserMissYesterday(userId, currentDate);
  if (!missedYesterday) {
    return null;
  }

  const yesterday = getSeoulYesterday(currentDate);

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
        originalStreak: streakInfo?.currentStreak || 0, // Store the original streak value
      },
    },
  };
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
    },
  };
}

/**
 * Calculate eligible → onStreak transition
 */
export async function calculateEligibleToOnStreak(
  userId: string,
  postDate: Date,
): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);

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

  const todayPostCount = await countSeoulDatePosts(userId, postDate);

  // Return progress update if not yet completed
  if (todayPostCount < status.postsRequired) {
    const baseUpdate = createBaseUpdate(
      userId,
      `eligible progress updated (${todayPostCount}/${status.postsRequired})`,
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

  // Recovery completed - restore original streak and update longest streak
  const baseUpdate = createBaseUpdate(
    userId,
    `eligible → onStreak (recovery completed with ${todayPostCount} posts)`,
  );

  const originalStreak = status.originalStreak || 0;

  // Check if recovery completion day is a working day
  const isRecoveryDayWorkingDay = isSeoulWorkingDay(postDate);
  const restoredStreak = originalStreak + (isRecoveryDayWorkingDay ? 1 : 0); // Add 1 only if recovery day is a working day

  const newLongestStreak = Math.max(streakInfo.longestStreak || 0, restoredStreak);

  const baseUpdates = {
    ...baseUpdate.updates,
    lastContributionDate: formatSeoulDate(postDate),
    currentStreak: restoredStreak,
    longestStreak: newLongestStreak,
    status: {
      type: RecoveryStatusType.ON_STREAK,
    },
  };

  return {
    ...baseUpdate,
    updates: baseUpdates,
  };
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
  const baseUpdates = {
    ...baseUpdate.updates,
    lastContributionDate: formatSeoulDate(postDate),
    status: {
      type: RecoveryStatusType.ON_STREAK,
    },
  };

  const updatesWithStreaks = await addStreakCalculations(userId, baseUpdates, true);

  return {
    ...baseUpdate,
    updates: updatesWithStreaks,
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

  const baseUpdate = createBaseUpdate(userId, 'onStreak → onStreak (streak maintained)');
  const baseUpdates = {
    ...baseUpdate.updates,
    lastContributionDate: formatSeoulDate(postDate),
    status: {
      type: RecoveryStatusType.ON_STREAK,
    },
  };

  const updatesWithStreaks = await addStreakCalculations(userId, baseUpdates, true);

  return {
    ...baseUpdate,
    updates: updatesWithStreaks,
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
          const updatesWithStreaks = await addStreakCalculations(userId, eligibleUpdate.updates);
          return { ...eligibleUpdate, updates: updatesWithStreaks };
        }
        break;
      }

      case RecoveryStatusType.ELIGIBLE: {
        const missedUpdate = await calculateEligibleToMissed(userId, currentDate);
        if (missedUpdate) {
          const updatesWithStreaks = await addStreakCalculations(userId, missedUpdate.updates);
          return { ...missedUpdate, updates: updatesWithStreaks };
        }
        break;
      }

      case RecoveryStatusType.MISSED:
        // No automatic transitions from missed state at midnight
        break;

      default:
        console.warn(`[StateTransition] Unknown status type: ${streakInfo.status.type}`);
        return null;
    }

    // If no status transitions, check if streak updates are needed
    return await calculateMidnightStreakUpdate(userId, currentDate);
  } catch (error) {
    console.error(
      `[StateTransition] Error calculating midnight transitions for user ${userId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Calculate streak updates for midnight recalculation
 */
async function calculateMidnightStreakUpdate(
  userId: string,
  _currentDate: Date,
): Promise<DBUpdate | null> {
  try {
    const { data: streakInfo } = await getOrCreateStreakInfo(userId);

    if (!streakInfo) {
      return null;
    }

    const streakData = await calculateUserStreaks(userId);

    // Only create update if streaks have changed
    if (
      streakData.currentStreak !== streakInfo.currentStreak ||
      streakData.longestStreak !== streakInfo.longestStreak
    ) {
      const baseUpdate = createBaseUpdate(
        userId,
        `midnight streak update (current: ${streakData.currentStreak}, longest: ${streakData.longestStreak})`,
      );

      return {
        ...baseUpdate,
        updates: {
          ...baseUpdate.updates,
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          ...(streakData.lastContributionDate && {
            lastContributionDate: streakData.lastContributionDate,
          }),
        },
      };
    }

    return null;
  } catch (error) {
    console.error(
      `[StreakCalculation] Error calculating midnight streaks for user ${userId}:`,
      error,
    );
    return null;
  }
}

// ===== BATCH PROCESSING UTILITIES =====

export interface BatchProcessingResult {
  updates: DBUpdate[];
  processedCount: number;
  errorCount: number;
}

export interface UserTransitionResult {
  userId: string;
  update: DBUpdate | null;
}

export async function processUserTransitionSafe<T extends Date>(
  userId: string,
  date: T,
  calculateFn: (userId: string, date: T) => Promise<DBUpdate | null>,
): Promise<UserTransitionResult> {
  try {
    const update = await calculateFn(userId, date);
    return { userId, update };
  } catch (error) {
    throw new Error(`User ${userId}: ${error instanceof Error ? error.message : error}`);
  }
}

export function collectTransitionResults(
  results: PromiseSettledResult<UserTransitionResult>[],
): BatchProcessingResult {
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
