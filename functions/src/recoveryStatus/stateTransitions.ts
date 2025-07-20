import { Timestamp } from "firebase-admin/firestore";
import { toSeoulDate } from "../shared/dateUtils";
import { 
  didUserMissYesterday, 
  calculateRecoveryRequirement, 
  countPostsOnDate,
  formatDateString,
  isDateAfter,
  getOrCreateStreakInfo,
  updateStreakInfo
} from "./streakUtils";
import { StreakInfo } from "./StreakInfo";
import { calculateUserStreaks, calculateStreaksAfterNewPosting } from "./streakCalculations";

export interface DBUpdate {
  userId: string;
  updates: Partial<StreakInfo> & { lastCalculated: Timestamp };
  reason: string;
}

/**
 * Helper function to add streak calculations to DB updates
 */
async function addStreakCalculations(
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
 * 1. onStreak → eligible : at midnight after user missed a working day (PURE)
 */
export async function calculateOnStreakToEligible(userId: string, currentDate: Date): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  
  if (!streakInfo || streakInfo.status.type !== 'onStreak') {
    return null;
  }
  
  // Check if user missed yesterday (working day)
  const missedYesterday = await didUserMissYesterday(userId, currentDate);
  
  if (!missedYesterday) {
    return null;
  }
  
  // Calculate recovery requirement
  const seoulDate = toSeoulDate(currentDate);
  const yesterday = new Date(seoulDate);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const recoveryReq = calculateRecoveryRequirement(yesterday, seoulDate);
  
  // Return DB update instead of performing it
  return {
    userId,
    updates: {
      status: {
        type: 'eligible',
        postsRequired: recoveryReq.postsRequired,
        currentPosts: recoveryReq.currentPosts,
        deadline: recoveryReq.deadline,
        missedDate: recoveryReq.missedDate
      },
      lastCalculated: Timestamp.now()
    },
    reason: `onStreak → eligible (missed ${recoveryReq.missedDate})`
  };
}

/**
 * 1. onStreak → eligible : at midnight after user missed a working day (LEGACY)
 */
export async function handleOnStreakToEligible(userId: string, currentDate: Date): Promise<boolean> {
  const dbUpdate = await calculateOnStreakToEligible(userId, currentDate);
  
  if (!dbUpdate) {
    return false;
  }
  
  await updateStreakInfo(userId, dbUpdate.updates);
  console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`);
  return true;
}

/**
 * 2. eligible → missed : at midnight of recovery deadline without recovery (PURE)
 */
export async function calculateEligibleToMissed(userId: string, currentDate: Date): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  
  if (!streakInfo || streakInfo.status.type !== 'eligible') {
    return null;
  }
  
  const seoulDate = toSeoulDate(currentDate);
  const currentDateString = formatDateString(seoulDate);
  
  // Check if deadline has passed
  // Note: We use isDateAfter to check if current date is AFTER the deadline
  // This means posts written ON the deadline day are still valid
  if (!streakInfo.status.deadline || !isDateAfter(currentDateString, streakInfo.status.deadline)) {
    return null;
  }
  
  // Return DB update instead of performing it
  return {
    userId,
    updates: {
      status: {
        type: 'missed'
      },
      lastCalculated: Timestamp.now()
    },
    reason: `eligible → missed (deadline ${streakInfo.status.deadline} passed)`
  };
}

/**
 * 2. eligible → missed : at midnight of recovery deadline without recovery (LEGACY)
 */
export async function handleEligibleToMissed(userId: string, currentDate: Date): Promise<boolean> {
  const dbUpdate = await calculateEligibleToMissed(userId, currentDate);
  
  if (!dbUpdate) {
    return false;
  }
  
  await updateStreakInfo(userId, dbUpdate.updates);
  console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`);
  return true;
}

/**
 * 3. eligible → onStreak : when user writes required number of posts (PURE)
 */
export async function calculateEligibleToOnStreak(userId: string, postDate: Date): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  
  if (!streakInfo || streakInfo.status.type !== 'eligible') {
    return null;
  }
  
  if (!streakInfo.status.postsRequired) {
    console.error(`[StateTransition] User ${userId} eligible status missing postsRequired`);
    return null;
  }
  
  // Count posts written today
  const seoulDate = toSeoulDate(postDate);
  const todayPostCount = await countPostsOnDate(userId, seoulDate);
  
  // Check if required posts completed
  if (todayPostCount < streakInfo.status.postsRequired) {
    // Return progress update
    return {
      userId,
      updates: {
        status: {
          ...streakInfo.status,
          currentPosts: todayPostCount
        },
        lastCalculated: Timestamp.now()
      },
      reason: `eligible progress updated (${todayPostCount}/${streakInfo.status.postsRequired})`
    };
  }
  
  // Recovery completed! Return onStreak update with streak calculations
  const baseUpdates = {
    lastContributionDate: formatDateString(seoulDate),
    status: {
      type: 'onStreak' as const
    },
    lastCalculated: Timestamp.now()
  };
  
  const updatesWithStreaks = await addStreakCalculations(userId, baseUpdates, true);
  
  return {
    userId,
    updates: updatesWithStreaks,
    reason: `eligible → onStreak (recovery completed with ${todayPostCount} posts)`
  };
}

/**
 * 3. eligible → onStreak : when user writes required number of posts (LEGACY)
 */
export async function handleEligibleToOnStreak(userId: string, postDate: Date): Promise<boolean> {
  const dbUpdate = await calculateEligibleToOnStreak(userId, postDate);
  
  if (!dbUpdate) {
    return false;
  }
  
  await updateStreakInfo(userId, dbUpdate.updates);
  console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`);
  
  // Return true only if fully recovered (not just progress update)
  return dbUpdate.reason.includes('recovery completed');
}

/**
 * 4. missed → onStreak : when user writes a post (starts new streak) (PURE)
 */
export async function calculateMissedToOnStreak(userId: string, postDate: Date): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  
  if (!streakInfo || streakInfo.status.type !== 'missed') {
    return null;
  }
  
  const seoulDate = toSeoulDate(postDate);
  
  // Any post starts a fresh streak with updated streak calculations
  const baseUpdates = {
    lastContributionDate: formatDateString(seoulDate),
    status: {
      type: 'onStreak' as const
    },
    lastCalculated: Timestamp.now()
  };
  
  const updatesWithStreaks = await addStreakCalculations(userId, baseUpdates, true);
  
  return {
    userId,
    updates: updatesWithStreaks,
    reason: 'missed → onStreak (fresh start)'
  };
}

/**
 * 4. missed → onStreak : when user writes a post (starts new streak) (LEGACY)
 */
export async function handleMissedToOnStreak(userId: string, postDate: Date): Promise<boolean> {
  const dbUpdate = await calculateMissedToOnStreak(userId, postDate);
  
  if (!dbUpdate) {
    return false;
  }
  
  await updateStreakInfo(userId, dbUpdate.updates);
  console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`);
  return true;
}

/**
 * Calculate streak updates for midnight recalculation (PURE)
 */
export async function calculateMidnightStreakUpdate(userId: string, _currentDate: Date): Promise<DBUpdate | null> {
  try {
    const { data: streakInfo } = await getOrCreateStreakInfo(userId);
    
    if (!streakInfo) {
      return null;
    }
    
    // Calculate updated streaks
    const streakData = await calculateUserStreaks(userId);
    
    // Only create update if streaks have changed
    if (streakData.currentStreak !== streakInfo.currentStreak || 
        streakData.longestStreak !== streakInfo.longestStreak) {
      
      return {
        userId,
        updates: {
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          ...(streakData.lastContributionDate && {
            lastContributionDate: streakData.lastContributionDate
          }),
          lastCalculated: Timestamp.now()
        },
        reason: `midnight streak update (current: ${streakData.currentStreak}, longest: ${streakData.longestStreak})`
      };
    }
    
    return null;
    
  } catch (error) {
    console.error(`[StreakCalculation] Error calculating midnight streaks for user ${userId}:`, error);
    return null;
  }
}

/**
 * Calculate all state transitions for midnight update (PURE)
 */
export async function calculateMidnightTransitions(userId: string, currentDate: Date): Promise<DBUpdate | null> {
  try {
    // Try onStreak → eligible first
    const eligibleUpdate = await calculateOnStreakToEligible(userId, currentDate);
    
    if (eligibleUpdate) {
      // Add streak calculations to the status transition
      const updatesWithStreaks = await addStreakCalculations(userId, eligibleUpdate.updates);
      return {
        ...eligibleUpdate,
        updates: updatesWithStreaks
      };
    }
    
    // If not transitioned to eligible, check eligible → missed
    const missedUpdate = await calculateEligibleToMissed(userId, currentDate);
    
    if (missedUpdate) {
      // Add streak calculations to the status transition
      const updatesWithStreaks = await addStreakCalculations(userId, missedUpdate.updates);
      return {
        ...missedUpdate,
        updates: updatesWithStreaks
      };
    }
    
    // If no status transitions, check if streak updates are needed
    return await calculateMidnightStreakUpdate(userId, currentDate);
    
  } catch (error) {
    console.error(`[StateTransition] Error calculating midnight transitions for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Process all state transitions for midnight update (LEGACY)
 */
export async function processMidnightTransitions(userId: string, currentDate: Date): Promise<void> {
  try {
    // Try onStreak → eligible first
    const transitionedToEligible = await handleOnStreakToEligible(userId, currentDate);
    
    if (!transitionedToEligible) {
      // If not transitioned to eligible, check eligible → missed
      await handleEligibleToMissed(userId, currentDate);
    }
    
  } catch (error) {
    console.error(`[StateTransition] Error processing midnight transitions for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Calculate all state transitions for posting creation (PURE)
 */
export async function calculatePostingTransitions(userId: string, postDate: Date): Promise<DBUpdate | null> {
  try {
    // Try eligible → onStreak first
    const eligibleUpdate = await calculateEligibleToOnStreak(userId, postDate);
    
    if (eligibleUpdate) {
      return eligibleUpdate;
    }
    
    // If not in eligible state, check missed → onStreak
    const missedUpdate = await calculateMissedToOnStreak(userId, postDate);
    
    return missedUpdate;
    
  } catch (error) {
    console.error(`[StateTransition] Error calculating posting transitions for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Process state transitions triggered by posting creation (LEGACY)
 */
export async function processPostingTransitions(userId: string, postDate: Date): Promise<void> {
  try {
    // Try eligible → onStreak first
    const recoveryCompleted = await handleEligibleToOnStreak(userId, postDate);
    
    if (!recoveryCompleted) {
      // If not in eligible state, check missed → onStreak  
      await handleMissedToOnStreak(userId, postDate);
    }
    
  } catch (error) {
    console.error(`[StateTransition] Error processing posting transitions for user ${userId}:`, error);
    throw error;
  }
}

// Re-export batch processing types and interfaces for convenience
export interface BatchProcessingResult {
  updates: DBUpdate[];
  processedCount: number;
  errorCount: number;
}

export interface UserTransitionResult {
  userId: string;
  update: DBUpdate | null;
}

/**
 * Pure function to process a single user's transition with error wrapping
 */
export async function processUserTransitionSafe<T extends Date>(
  userId: string, 
  date: T,
  calculateFn: (userId: string, date: T) => Promise<DBUpdate | null>
): Promise<UserTransitionResult> {
  try {
    const update = await calculateFn(userId, date);
    return { userId, update };
  } catch (error) {
    throw new Error(`User ${userId}: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Pure function to collect results from Promise.allSettled for any transition type
 */
export function collectTransitionResults(results: PromiseSettledResult<UserTransitionResult>[]): BatchProcessingResult {
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