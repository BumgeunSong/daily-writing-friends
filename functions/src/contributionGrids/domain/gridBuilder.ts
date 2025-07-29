import { ContributionDay, ActivityType, DateRange } from './models';
import { 
  formatDate, 
  isWeekend, 
  calculateWeekAndColumn, 
  createContributionDay,
  calculatePostingValue,
  calculateCommentingValue
} from './gridCalculator';

/**
 * Domain Service for Building Contribution Grids
 * Contains pure business logic for building grids from activities
 */

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
    value = calculateCommentingValue();
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
 * Build grid from activities with date range
 */
export function buildGridFromActivitiesWithRange(
  activities: any[],
  dateRange: DateRange,
  activityType: ActivityType,
): ContributionDay[] {
  return buildGridFromActivities(activities, dateRange.start, dateRange.end, activityType);
}