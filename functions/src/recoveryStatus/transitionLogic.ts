// Timestamp is imported in recoveryUtils.ts
import { createRecoveryHistory, updateLongestStreak } from './recoveryUtils';
import { RecoveryStatusType, StreakInfo } from './StreakInfo';
import { DBUpdate, validateUserState, createBaseUpdate } from './transitionHelpers';
import {
  calculateRecoveryRequirement,
  formatSeoulDate,
  getSeoulYesterday,
  hasDeadlinePassed,
  isSeoulWorkingDay,
} from '../shared/calendar';

/**
 * Pure function: Calculate onStreak → eligible transition
 * Triggered when user misses a working day
 */
export function calculateOnStreakToEligiblePure(
  userId: string,
  currentDate: Date,
  streakInfo: StreakInfo | null,
  hadPostsYesterday: boolean,
): DBUpdate | null {
  if (!validateUserState(streakInfo, RecoveryStatusType.ON_STREAK)) {
    return null;
  }

  const yesterday = getSeoulYesterday(currentDate);

  // Per PRD: Only check working day misses
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
      currentStreak: 0, // Reset immediately per PRD
      originalStreak: streakInfo ? streakInfo.currentStreak : 0, // Preserve current streak
    },
  };
}

/**
 * Pure function: Calculate eligible → onStreak transition
 * Triggered when user completes recovery requirements
 */
export function calculateEligibleToOnStreakPure(
  userId: string,
  postDate: Date,
  streakInfo: StreakInfo | null,
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

  // Recovery completed - transition to onStreak
  const originalStreak = streakInfo.originalStreak || 0;
  const isRecoveryOnWorkingDay = isSeoulWorkingDay(postDate);

  // Policy v2:
  // - Working day recovery (Mon–Fri): currentStreak = originalStreak + 2
  // - Weekend recovery (Fri->Sat): currentStreak = originalStreak + 1
  let newCurrentStreak: number;
  let newOriginalStreak: number;

  if (isRecoveryOnWorkingDay) {
    newCurrentStreak = originalStreak + 2;
    newOriginalStreak = originalStreak + 2;
  } else {
    newCurrentStreak = originalStreak + 1;
    newOriginalStreak = originalStreak + 1;
  }

  const newLongestStreak = updateLongestStreak(streakInfo.longestStreak, newCurrentStreak);
  const recoveryHistory = createRecoveryHistory(status, postDate, todayPostCount);
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
      recoveryHistory,
    },
  };
}

/**
 * Pure function: Calculate eligible → missed transition
 * Triggered when recovery deadline passes without completion
 */
export function calculateEligibleToMissedPure(
  userId: string,
  currentDate: Date,
  streakInfo: StreakInfo | null,
): DBUpdate | null {
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
    `eligible → missed (deadline ${status.deadline.toDate().toISOString()} passed)`,
  );

  // Per REQ-010: Preserve partial progress in currentStreak, clear originalStreak
  const partialProgress = status.currentPosts || 0;

  return {
    ...baseUpdate,
    updates: {
      ...baseUpdate.updates,
      status: {
        type: RecoveryStatusType.MISSED,
      },
      currentStreak: partialProgress, // Preserve partial progress
      originalStreak: 0, // Clear original streak per PRD
    },
  };
}

/**
 * Pure function: Calculate missed → onStreak transition
 * Handles both same-day two-post path and cross-day building path
 */
export function calculateMissedToOnStreakPure(
  userId: string,
  postDate: Date,
  streakInfo: StreakInfo | null,
  todayPostCount: number,
): DBUpdate | null {
  if (!validateUserState(streakInfo, RecoveryStatusType.MISSED)) {
    return null;
  }

  if (!streakInfo) {
    return null;
  }

  const currentStreak = streakInfo.currentStreak || 0;
  const newCurrentStreak = currentStreak + 1;

  // Per REQ-011: Two paths to regain onStreak
  // Path 1: Same-day two-post path (first post → eligible, second post → onStreak)
  if (todayPostCount >= 2) {
    return handleSameDayRecovery(userId, postDate, streakInfo, todayPostCount);
  }

  // First post of the day - behavior depends on day type
  if (todayPostCount === 1) {
    return handleFirstPostOfDay(userId, postDate, streakInfo, newCurrentStreak);
  }

  // No posts today - stay missed but update currentStreak if it had previous progress
  if (todayPostCount === 0 && currentStreak > 0) {
    const baseUpdate = createBaseUpdate(userId, 'missed (maintaining partial progress)');

    return {
      ...baseUpdate,
      updates: {
        ...baseUpdate.updates,
        status: { type: RecoveryStatusType.MISSED },
        currentStreak: currentStreak, // Keep existing streak
      },
    };
  }

  // No posts today and no existing progress - return null (no change)
  return null;
}

/**
 * Handle same-day recovery (≥2 posts same day)
 */
function handleSameDayRecovery(
  userId: string,
  postDate: Date,
  streakInfo: StreakInfo,
  todayPostCount: number,
): DBUpdate {
  // Calculate recovery requirement for RecoveryHistory
  const recoveryReq = calculateRecoveryRequirement(postDate, postDate);
  const newLongestStreak = updateLongestStreak(streakInfo.longestStreak, todayPostCount);
  const recoveryHistory = createRecoveryHistory(recoveryReq, postDate, todayPostCount);
  const baseUpdate = createBaseUpdate(userId, 'missed → onStreak (same-day recovery)');

  return {
    ...baseUpdate,
    updates: {
      ...baseUpdate.updates,
      status: { type: RecoveryStatusType.ON_STREAK },
      currentStreak: todayPostCount, // Fresh start with posts made today
      originalStreak: todayPostCount, // Fresh start
      longestStreak: newLongestStreak,
      lastContributionDate: formatSeoulDate(postDate),
      recoveryHistory,
    },
  };
}

/**
 * Handle first post of the day logic
 */
function handleFirstPostOfDay(
  userId: string,
  postDate: Date,
  streakInfo: StreakInfo,
  newCurrentStreak: number,
): DBUpdate {
  const isWorkingDay = isSeoulWorkingDay(postDate);
  const newLongestStreak = updateLongestStreak(streakInfo.longestStreak, newCurrentStreak);

  if (isWorkingDay) {
    // Working day (Mon-Fri): Need 2 posts for recovery → with 1 post, go to eligible
    if (streakInfo.currentStreak > 0) {
      // Had previous progress - transition to eligible for same-day recovery opportunity
      const recoveryReq = calculateRecoveryRequirement(postDate, postDate);
      const baseUpdate = createBaseUpdate(
        userId,
        'missed → eligible (1 post on working day, need 2 total)',
      );

      return {
        ...baseUpdate,
        updates: {
          ...baseUpdate.updates,
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: recoveryReq.postsRequired,
            currentPosts: 1,
            deadline: recoveryReq.deadline,
            missedDate: recoveryReq.missedDate,
          },
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastContributionDate: formatSeoulDate(postDate),
        },
      };
    } else {
      // No previous progress, still building
      const baseUpdate = createBaseUpdate(
        userId,
        'missed (building streak on working day, currentStreak < 2)',
      );

      return {
        ...baseUpdate,
        updates: {
          ...baseUpdate.updates,
          status: { type: RecoveryStatusType.MISSED },
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastContributionDate: formatSeoulDate(postDate),
        },
      };
    }
  } else {
    // Weekend (Sat): Need 1 post for recovery → with 1 post, complete recovery if currentStreak ≥ 2
    if (newCurrentStreak >= 2) {
      const baseUpdate = createBaseUpdate(
        userId,
        'missed → onStreak (weekend recovery, 1 post sufficient)',
      );

      return {
        ...baseUpdate,
        updates: {
          ...baseUpdate.updates,
          status: { type: RecoveryStatusType.ON_STREAK },
          currentStreak: newCurrentStreak,
          originalStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastContributionDate: formatSeoulDate(postDate),
        },
      };
    } else {
      // Still building streak, stay missed
      const baseUpdate = createBaseUpdate(
        userId,
        'missed (building streak on weekend, currentStreak < 2)',
      );

      return {
        ...baseUpdate,
        updates: {
          ...baseUpdate.updates,
          status: { type: RecoveryStatusType.MISSED },
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastContributionDate: formatSeoulDate(postDate),
        },
      };
    }
  }
}

/**
 * Pure function: Calculate streak maintenance for onStreak users at midnight
 */
export function calculateMidnightStreakMaintenancePure(
  userId: string,
  currentDate: Date,
  streakInfo: StreakInfo | null,
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
