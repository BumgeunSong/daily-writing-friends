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
import { RecoveryStatusType } from "./StreakInfo";
import { DBUpdate, addStreakCalculations, validateUserState, createBaseUpdate } from "./transitionHelpers";

// Re-export DBUpdate for backward compatibility
export { DBUpdate } from "./transitionHelpers";

// ===== CORE TRANSITION CALCULATORS (PURE FUNCTIONS) =====

/**
 * Calculate onStreak → eligible transition
 */
export async function calculateOnStreakToEligible(userId: string, currentDate: Date): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  
  if (!validateUserState(streakInfo, RecoveryStatusType.ON_STREAK)) {
    return null;
  }
  
  const missedYesterday = await didUserMissYesterday(userId, currentDate);
  if (!missedYesterday) {
    return null;
  }
  
  const seoulDate = toSeoulDate(currentDate);
  const yesterday = new Date(seoulDate);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const recoveryReq = calculateRecoveryRequirement(yesterday, seoulDate);
  const baseUpdate = createBaseUpdate(userId, `onStreak → eligible (missed ${recoveryReq.missedDate})`);
  
  return {
    ...baseUpdate,
    updates: {
      ...baseUpdate.updates,
      status: {
        type: RecoveryStatusType.ELIGIBLE,
        postsRequired: recoveryReq.postsRequired,
        currentPosts: recoveryReq.currentPosts,
        deadline: recoveryReq.deadline,
        missedDate: recoveryReq.missedDate
      }
    }
  };
}

/**
 * Calculate eligible → missed transition
 */
export async function calculateEligibleToMissed(userId: string, currentDate: Date): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  
  if (!validateUserState(streakInfo, RecoveryStatusType.ELIGIBLE)) {
    return null;
  }
  
  const seoulDate = toSeoulDate(currentDate);
  const currentDateString = formatDateString(seoulDate);
  
  if (!streakInfo!.status.deadline || !isDateAfter(currentDateString, streakInfo!.status.deadline)) {
    return null;
  }
  
  const baseUpdate = createBaseUpdate(userId, `eligible → missed (deadline ${streakInfo!.status.deadline} passed)`);
  
  return {
    ...baseUpdate,
    updates: {
      ...baseUpdate.updates,
      status: {
        type: RecoveryStatusType.MISSED
      }
    }
  };
}

/**
 * Calculate eligible → onStreak transition
 */
export async function calculateEligibleToOnStreak(userId: string, postDate: Date): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  
  if (!validateUserState(streakInfo, RecoveryStatusType.ELIGIBLE)) {
    return null;
  }
  
  if (!streakInfo!.status.postsRequired) {
    console.error(`[StateTransition] User ${userId} eligible status missing postsRequired`);
    return null;
  }
  
  const seoulDate = toSeoulDate(postDate);
  const todayPostCount = await countPostsOnDate(userId, seoulDate);
  
  // Return progress update if not yet completed
  if (todayPostCount < streakInfo!.status.postsRequired) {
    const baseUpdate = createBaseUpdate(userId, `eligible progress updated (${todayPostCount}/${streakInfo!.status.postsRequired})`);
    
    return {
      ...baseUpdate,
      updates: {
        ...baseUpdate.updates,
        status: {
          ...streakInfo!.status,
          currentPosts: todayPostCount
        }
      }
    };
  }
  
  // Recovery completed
  const baseUpdate = createBaseUpdate(userId, `eligible → onStreak (recovery completed with ${todayPostCount} posts)`);
  const baseUpdates = {
    ...baseUpdate.updates,
    lastContributionDate: formatDateString(seoulDate),
    status: {
      type: RecoveryStatusType.ON_STREAK
    }
  };
  
  const updatesWithStreaks = await addStreakCalculations(userId, baseUpdates, true);
  
  return {
    ...baseUpdate,
    updates: updatesWithStreaks
  };
}

/**
 * Calculate missed → onStreak transition
 */
export async function calculateMissedToOnStreak(userId: string, postDate: Date): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  
  if (!validateUserState(streakInfo, RecoveryStatusType.MISSED)) {
    return null;
  }
  
  const seoulDate = toSeoulDate(postDate);
  const baseUpdate = createBaseUpdate(userId, 'missed → onStreak (fresh start)');
  const baseUpdates = {
    ...baseUpdate.updates,
    lastContributionDate: formatDateString(seoulDate),
    status: {
      type: RecoveryStatusType.ON_STREAK
    }
  };
  
  const updatesWithStreaks = await addStreakCalculations(userId, baseUpdates, true);
  
  return {
    ...baseUpdate,
    updates: updatesWithStreaks
  };
}

/**
 * Calculate onStreak → onStreak transition (maintain streak)
 */
export async function calculateOnStreakToOnStreak(userId: string, postDate: Date): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  
  if (!validateUserState(streakInfo, RecoveryStatusType.ON_STREAK)) {
    return null;
  }
  
  const seoulDate = toSeoulDate(postDate);
  const baseUpdate = createBaseUpdate(userId, 'onStreak → onStreak (streak maintained)');
  const baseUpdates = {
    ...baseUpdate.updates,
    lastContributionDate: formatDateString(seoulDate),
    status: {
      type: RecoveryStatusType.ON_STREAK
    }
  };
  
  const updatesWithStreaks = await addStreakCalculations(userId, baseUpdates, true);
  
  return {
    ...baseUpdate,
    updates: updatesWithStreaks
  };
}

// ===== ORCHESTRATOR FUNCTIONS =====

/**
 * Calculate all possible posting transitions using switch statement
 */
export async function calculatePostingTransitions(userId: string, postDate: Date): Promise<DBUpdate | null> {
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
    console.error(`[StateTransition] Error calculating posting transitions for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Calculate all possible midnight transitions using switch statement
 */
export async function calculateMidnightTransitions(userId: string, currentDate: Date): Promise<DBUpdate | null> {
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
    console.error(`[StateTransition] Error calculating midnight transitions for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Calculate streak updates for midnight recalculation
 */
async function calculateMidnightStreakUpdate(userId: string, _currentDate: Date): Promise<DBUpdate | null> {
  try {
    const { data: streakInfo } = await getOrCreateStreakInfo(userId);
    
    if (!streakInfo) {
      return null;
    }
    
    const streakData = await calculateUserStreaks(userId);
    
    // Only create update if streaks have changed
    if (streakData.currentStreak !== streakInfo.currentStreak || 
        streakData.longestStreak !== streakInfo.longestStreak) {
      
      const baseUpdate = createBaseUpdate(userId, `midnight streak update (current: ${streakData.currentStreak}, longest: ${streakData.longestStreak})`);
      
      return {
        ...baseUpdate,
        updates: {
          ...baseUpdate.updates,
          currentStreak: streakData.currentStreak,
          longestStreak: streakData.longestStreak,
          ...(streakData.lastContributionDate && {
            lastContributionDate: streakData.lastContributionDate
          })
        }
      };
    }
    
    return null;
    
  } catch (error) {
    console.error(`[StreakCalculation] Error calculating midnight streaks for user ${userId}:`, error);
    return null;
  }
}

// ===== LEGACY WRAPPER FUNCTIONS =====

export async function handleOnStreakToEligible(userId: string, currentDate: Date): Promise<boolean> {
  const dbUpdate = await calculateOnStreakToEligible(userId, currentDate);
  if (!dbUpdate) return false;
  
  await updateStreakInfo(userId, dbUpdate.updates);
  console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`);
  return true;
}

export async function handleEligibleToMissed(userId: string, currentDate: Date): Promise<boolean> {
  const dbUpdate = await calculateEligibleToMissed(userId, currentDate);
  if (!dbUpdate) return false;
  
  await updateStreakInfo(userId, dbUpdate.updates);
  console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`);
  return true;
}

export async function handleEligibleToOnStreak(userId: string, postDate: Date): Promise<boolean> {
  const dbUpdate = await calculateEligibleToOnStreak(userId, postDate);
  if (!dbUpdate) return false;
  
  await updateStreakInfo(userId, dbUpdate.updates);
  console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`);
  
  return dbUpdate.reason.includes('recovery completed');
}

export async function handleMissedToOnStreak(userId: string, postDate: Date): Promise<boolean> {
  const dbUpdate = await calculateMissedToOnStreak(userId, postDate);
  if (!dbUpdate) return false;
  
  await updateStreakInfo(userId, dbUpdate.updates);
  console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`);
  return true;
}

export async function handleOnStreakToOnStreak(userId: string, postDate: Date): Promise<boolean> {
  const dbUpdate = await calculateOnStreakToOnStreak(userId, postDate);
  if (!dbUpdate) return false;
  
  await updateStreakInfo(userId, dbUpdate.updates);
  console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`);
  return true;
}

export async function processMidnightTransitions(userId: string, currentDate: Date): Promise<void> {
  try {
    const transitionedToEligible = await handleOnStreakToEligible(userId, currentDate);
    
    if (!transitionedToEligible) {
      await handleEligibleToMissed(userId, currentDate);
    }
  } catch (error) {
    console.error(`[StateTransition] Error processing midnight transitions for user ${userId}:`, error);
    throw error;
  }
}

export async function processPostingTransitions(userId: string, postDate: Date): Promise<void> {
  try {
    const dbUpdate = await calculatePostingTransitions(userId, postDate);
    
    if (dbUpdate) {
      await updateStreakInfo(userId, dbUpdate.updates);
      console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`);
    }
  } catch (error) {
    console.error(`[StateTransition] Error processing posting transitions for user ${userId}:`, error);
    throw error;
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
  calculateFn: (userId: string, date: T) => Promise<DBUpdate | null>
): Promise<UserTransitionResult> {
  try {
    const update = await calculateFn(userId, date);
    return { userId, update };
  } catch (error) {
    throw new Error(`User ${userId}: ${error instanceof Error ? error.message : error}`);
  }
}

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

// Re-export the missing function that may be needed elsewhere
import { calculateUserStreaks } from "./streakCalculations";