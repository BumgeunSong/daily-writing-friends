import { ContributionGrid, ActivityType, ContributionGridUpdate } from '../domain/models';
import { 
  calculatePostingContributionUpdate, 
  calculateCommentingContributionUpdate,
  updateContributionForDate,
  sortAndLimitContributions,
} from '../domain/gridCalculator';
import { Posting } from '../../postings/Posting';
import { Commenting } from '../../commentings/Commenting';

/**
 * Pure Business Logic Functions for Contribution Grid Operations
 * These functions have no side effects and are easily testable
 */

/**
 * Calculate the result of processing a posting contribution (pure function)
 */
export function calculatePostingContributionResult(
  userId: string,
  postingData: Posting,
  existingGrid: ContributionGrid | null,
): {
  success: boolean;
  update?: ContributionGridUpdate;
  error?: string;
} {
  try {
    const update = calculatePostingContributionUpdate(userId, postingData, existingGrid);
    
    if (!update) {
      return {
        success: false,
        error: 'Failed to calculate posting contribution update',
      };
    }

    return {
      success: true,
      update,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate the result of processing a commenting contribution (pure function)
 */
export function calculateCommentingContributionResult(
  userId: string,
  commentingData: Commenting,
  existingGrid: ContributionGrid | null,
): {
  success: boolean;
  update?: ContributionGridUpdate;
  error?: string;
} {
  try {
    const update = calculateCommentingContributionUpdate(userId, commentingData, existingGrid);
    
    if (!update) {
      return {
        success: false,
        error: 'Failed to calculate commenting contribution update',
      };
    }

    return {
      success: true,
      update,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Calculate the updated grid from a contribution update (pure function)
 */
export function calculateUpdatedGrid(
  update: ContributionGridUpdate,
  currentGrid: ContributionGrid | null,
): ContributionGrid {
  let contributions = currentGrid?.contributions || [];
  
  // Update contributions with new data
  contributions = updateContributionForDate(contributions, update.date, update.value);
  contributions = sortAndLimitContributions(contributions);

  // Create updated grid
  return {
    contributions,
    maxValue: update.maxValue,
    lastUpdated: update.lastUpdated,
    timeRange: update.timeRange,
  };
}

/**
 * Validate contribution grid update data (pure function)
 */
export function validateContributionUpdate(update: ContributionGridUpdate): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!update.userId || typeof update.userId !== 'string') {
    errors.push('userId is required and must be a string');
  }

  if (!Object.values(ActivityType).includes(update.activityType)) {
    errors.push('activityType must be a valid ActivityType');
  }

  if (!update.date || !/^\d{4}-\d{2}-\d{2}$/.test(update.date)) {
    errors.push('date is required and must be in YYYY-MM-DD format');
  }

  if (typeof update.value !== 'number' || update.value < 0) {
    errors.push('value must be a non-negative number');
  }

  if (!update.reason || typeof update.reason !== 'string') {
    errors.push('reason is required and must be a string');
  }

  if (typeof update.maxValue !== 'number' || update.maxValue < 0) {
    errors.push('maxValue must be a non-negative number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate batch processing result (pure function)
 */
export function calculateBatchResult(
  updates: Array<{
    userId: string;
    activityType: ActivityType;
    grid: ContributionGrid;
  }>,
): {
  totalUpdates: number;
  postingUpdates: number;
  commentingUpdates: number;
  userCount: number;
} {
  const uniqueUsers = new Set<string>();
  let postingUpdates = 0;
  let commentingUpdates = 0;

  for (const update of updates) {
    uniqueUsers.add(update.userId);
    
    if (update.activityType === ActivityType.POSTING) {
      postingUpdates++;
    } else if (update.activityType === ActivityType.COMMENTING) {
      commentingUpdates++;
    }
  }

  return {
    totalUpdates: updates.length,
    postingUpdates,
    commentingUpdates,
    userCount: uniqueUsers.size,
  };
}

/**
 * Determine if a grid update should be processed (pure function)
 */
export function shouldProcessUpdate(
  update: ContributionGridUpdate,
  existingGrid: ContributionGrid | null,
): {
  shouldProcess: boolean;
  reason: string;
} {
  // Validate the update first
  const validation = validateContributionUpdate(update);
  if (!validation.isValid) {
    return {
      shouldProcess: false,
      reason: `Validation failed: ${validation.errors.join(', ')}`,
    };
  }

  // Check if this would be a meaningful update
  if (update.value === 0) {
    return {
      shouldProcess: false,
      reason: 'Update value is zero, no change needed',
    };
  }

  // Check if the date already exists with the same or higher value
  if (existingGrid?.contributions) {
    const existingContribution = existingGrid.contributions.find(c => c.day === update.date);
    if (existingContribution && existingContribution.value >= update.value) {
      return {
        shouldProcess: false,
        reason: `Existing contribution for ${update.date} has equal or higher value`,
      };
    }
  }

  return {
    shouldProcess: true,
    reason: 'Update is valid and meaningful',
  };
}