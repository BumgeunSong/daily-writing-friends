import { getOrCreateStreakInfo } from './streakUtils';
import { RecoveryStatusType } from './StreakInfo';
import { DBUpdate, createBaseUpdate } from './transitionHelpers';
import {
  calculateOnStreakToEligiblePure,
  calculateEligibleToOnStreakPure,
  calculateEligibleToMissedPure,
  calculateMissedToOnStreakPure,
  calculateMidnightStreakMaintenancePure,
} from './transitionLogic';
import { didUserMissYesterday, countSeoulDatePosts } from '../shared/calendar';

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
 * Database wrapper: Calculate eligible → missed transition
 */
export async function calculateEligibleToMissed(
  userId: string,
  currentDate: Date,
): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  
  return calculateEligibleToMissedPure(userId, currentDate, streakInfo);
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
 * Database wrapper: Calculate missed → onStreak transition
 */
export async function calculateMissedToOnStreak(
  userId: string,
  postDate: Date,
): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  const todayPostCount = await countSeoulDatePosts(userId, postDate);
  
  return calculateMissedToOnStreakPure(userId, postDate, streakInfo, todayPostCount);
}

/**
 * Calculate onStreak → onStreak transition (maintain streak)
 */
export async function calculateOnStreakToOnStreak(
  userId: string,
  postDate: Date,
): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);

  if (!streakInfo || streakInfo.status.type !== RecoveryStatusType.ON_STREAK) {
    return null;
  }

  const baseUpdate = createBaseUpdate(userId, 'onStreak → onStreak (streak maintained)');

  return {
    ...baseUpdate,
    updates: {
      ...baseUpdate.updates,
      lastContributionDate: postDate.toISOString().split('T')[0], // YYYY-MM-DD format
      status: {
        type: RecoveryStatusType.ON_STREAK,
      },
      currentStreak: streakInfo.currentStreak + 1, // Increment per PRD
      originalStreak: streakInfo.originalStreak + 1, // Increment per PRD
    },
  };
}

/**
 * Database wrapper: Calculate streak maintenance for onStreak users at midnight
 * Per PRD: if user posted on previous working day, increment both streaks
 */
export async function calculateMidnightStreakMaintenance(
  userId: string,
  currentDate: Date,
): Promise<DBUpdate | null> {
  try {
    const { data: streakInfo } = await getOrCreateStreakInfo(userId);
    const yesterdayPostCount = await countSeoulDatePosts(userId, new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
    const hadPostsYesterday = yesterdayPostCount > 0;
    
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
 * Per PRD: ensure missed state has currentStreak=0, originalStreak=0
 */
export async function calculateMissedStateMaintenance(
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

    const baseUpdate = createBaseUpdate(userId, 'missed state maintenance (reset streaks)');
    
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