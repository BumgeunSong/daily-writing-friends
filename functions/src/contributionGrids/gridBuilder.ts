import { ContributionDay, ContributionGrid, ActivityType } from './types';
import admin from '../shared/admin';
import {
  formatDate,
  isWeekend,
  calculatePostingValue,
  calculateCommentingValue,
  calculateWeekAndColumn,
  createContributionDay,
  createEmptyContributionGrid,
  updateContributionForDate,
  sortAndLimitContributions,
  updateGridMeta,
} from './gridUtils';
import { getWindowRange } from './gridUtils';

// Re-export getWindowRange for backward compatibility
export { getWindowRange };

/**
 * Process a single activity and add it to contributions map
 */
function processActivity(
  activity: any,
  contributions: Map<string, ContributionDay>,
  startDate: Date,
  endDate: Date,
  activityType: ActivityType,
): void {
  const activityDate = activity.createdAt.toDate();

  // Skip weekend activities
  if (isWeekend(activityDate)) {
    return;
  }

  // Skip activities outside window
  if (activityDate < startDate || activityDate > endDate) {
    return;
  }

  const dayKey = formatDate(activityDate);

  // Calculate value based on activity type
  let value = 0;
  if (activityType === ActivityType.POSTING) {
    value = calculatePostingValue(activity);
  } else if (activityType === ActivityType.COMMENTING) {
    value = calculateCommentingValue(activity);
  }

  // Aggregate values for same day
  if (contributions.has(dayKey)) {
    const existing = contributions.get(dayKey)!;
    existing.value += value;
  } else {
    const { week, column } = calculateWeekAndColumn(activityDate, startDate);
    contributions.set(dayKey, createContributionDay(dayKey, value, week, column));
  }
}

/**
 * Build grid from activities
 */
export function buildGridFromActivities(
  activities: any[],
  startDate: Date,
  endDate: Date,
  activityType: ActivityType,
): ContributionDay[] {
  const contributions = new Map<string, ContributionDay>();

  for (const activity of activities) {
    processActivity(activity, contributions, startDate, endDate, activityType);
  }

  return Array.from(contributions.values());
}

/**
 * Rebuild contribution grid from user activities
 */
export async function rebuildContributionGrid(
  userId: string,
  activityType: ActivityType,
): Promise<ContributionGrid> {
  // TODO: Implement actual Firestore queries
  // For now, return empty grid structure

  const now = new Date();
  const { start } = getWindowRange(now);

  return createEmptyContributionGrid(formatDate(start));
}

/**
 * Get Firestore document reference for contribution grid
 */
function getGridDocRef(userId: string, activityType: ActivityType) {
  const db = admin.firestore();
  const docId = `${userId}_${activityType}`;
  return db.collection('contributionGrids').doc(docId);
}

/**
 * Update contribution grid in real-time
 */
export async function updateContributionGridRealtime(
  userId: string,
  date: string,
  value: number,
  activityType: ActivityType,
): Promise<void> {
  const db = admin.firestore();
  const docRef = getGridDocRef(userId, activityType);

  await db.runTransaction(async (tx) => {
    const docSnap = await tx.get(docRef);
    let grid: ContributionGrid;

    if (!docSnap.exists) {
      // 새 그리드 생성
      grid = createEmptyContributionGrid(date);
    } else {
      grid = docSnap.data() as ContributionGrid;
    }

    // 1. 해당 날짜의 값 업데이트
    const updatedContributions = updateContributionForDate(grid.contributions, date, value);

    // 2. contributions를 날짜 오름차순 정렬하고 20개로 제한
    const sortedContributions = sortAndLimitContributions(updatedContributions);

    // 3. 그리드 메타 정보 업데이트
    const updatedGrid = updateGridMeta(grid, sortedContributions, date);

    // 4. Firestore에 저장
    tx.set(docRef, updatedGrid);
  });
}
