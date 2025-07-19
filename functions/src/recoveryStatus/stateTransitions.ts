import { toSeoulDate } from "../shared/dateUtils";
import { 
  didUserMissYesterday, 
  calculateRecoveryRequirement, 
  countPostsOnDate,
  formatDateString,
  getOrCreateStreakInfo,
  updateStreakInfo
} from "./streakUtils";
import { StreakInfo } from "./StreakInfo";

/**
 * 1. onStreak → eligible : at midnight after user missed a working day
 */
export async function handleOnStreakToEligible(userId: string, currentDate: Date): Promise<boolean> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  
  if (!streakInfo || streakInfo.status.type !== 'onStreak') {
    return false;
  }
  
  // Check if user missed yesterday (working day)
  const missedYesterday = await didUserMissYesterday(userId, currentDate);
  
  if (!missedYesterday) {
    return false;
  }
  
  // Calculate recovery requirement
  const seoulDate = toSeoulDate(currentDate);
  const yesterday = new Date(seoulDate);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const recoveryReq = calculateRecoveryRequirement(yesterday, seoulDate);
  
  // Update to eligible status
  const updatedStreakInfo: Partial<StreakInfo> = {
    status: {
      type: 'eligible',
      postsRequired: recoveryReq.postsRequired,
      currentPosts: recoveryReq.currentPosts,
      deadline: recoveryReq.deadline,
      missedDate: recoveryReq.missedDate
    }
  };
  
  await updateStreakInfo(userId, updatedStreakInfo);
  
  console.log(`[StateTransition] User ${userId}: onStreak → eligible (missed ${recoveryReq.missedDate})`);
  return true;
}

/**
 * 2. eligible → missed : at midnight of recovery deadline without recovery
 */
export async function handleEligibleToMissed(userId: string, currentDate: Date): Promise<boolean> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  
  if (!streakInfo || streakInfo.status.type !== 'eligible') {
    return false;
  }
  
  const seoulDate = toSeoulDate(currentDate);
  const currentDateString = formatDateString(seoulDate);
  
  // Check if deadline has passed
  if (!streakInfo.status.deadline || currentDateString <= streakInfo.status.deadline) {
    return false;
  }
  
  // Update to missed status
  const updatedStreakInfo: Partial<StreakInfo> = {
    status: {
      type: 'missed'
    }
  };
  
  await updateStreakInfo(userId, updatedStreakInfo);
  
  console.log(`[StateTransition] User ${userId}: eligible → missed (deadline ${streakInfo.status.deadline} passed)`);
  return true;
}

/**
 * 3. eligible → onStreak : when user writes required number of posts
 */
export async function handleEligibleToOnStreak(userId: string, postDate: Date): Promise<boolean> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  
  if (!streakInfo || streakInfo.status.type !== 'eligible') {
    return false;
  }
  
  if (!streakInfo.status.postsRequired) {
    console.error(`[StateTransition] User ${userId} eligible status missing postsRequired`);
    return false;
  }
  
  // Count posts written today
  const seoulDate = toSeoulDate(postDate);
  const todayPostCount = await countPostsOnDate(userId, seoulDate);
  
  // Check if required posts completed
  if (todayPostCount < streakInfo.status.postsRequired) {
    // Update current progress
    const updatedStreakInfo: Partial<StreakInfo> = {
      status: {
        ...streakInfo.status,
        currentPosts: todayPostCount
      }
    };
    
    await updateStreakInfo(userId, updatedStreakInfo);
    
    console.log(`[StateTransition] User ${userId}: eligible progress updated (${todayPostCount}/${streakInfo.status.postsRequired})`);
    return false;
  }
  
  // Recovery completed! Update to onStreak
  const updatedStreakInfo: Partial<StreakInfo> = {
    lastContributionDate: formatDateString(seoulDate),
    status: {
      type: 'onStreak'
    }
  };
  
  await updateStreakInfo(userId, updatedStreakInfo);
  
  console.log(`[StateTransition] User ${userId}: eligible → onStreak (recovery completed with ${todayPostCount} posts)`);
  return true;
}

/**
 * 4. missed → onStreak : when user writes a post (starts new streak)
 */
export async function handleMissedToOnStreak(userId: string, postDate: Date): Promise<boolean> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  
  if (!streakInfo || streakInfo.status.type !== 'missed') {
    return false;
  }
  
  const seoulDate = toSeoulDate(postDate);
  
  // Any post starts a fresh streak
  const updatedStreakInfo: Partial<StreakInfo> = {
    lastContributionDate: formatDateString(seoulDate),
    status: {
      type: 'onStreak'
    }
  };
  
  await updateStreakInfo(userId, updatedStreakInfo);
  
  console.log(`[StateTransition] User ${userId}: missed → onStreak (fresh start)`);
  return true;
}

/**
 * Process all state transitions for midnight update
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
 * Process state transitions triggered by posting creation
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