import { ActivityType, ContributionGrid } from './types';
import { Posting } from '../postings/Posting';
import { Commenting } from '../commentings/Commenting';
import { buildGridFromActivities } from './gridBuilder';
import { getWindowRange, formatDate } from './gridUtils';

// For pure functions, we'll use a simple timestamp representation
export interface SimpleTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface UserData {
  userId: string;
  postings: Posting[];
  commentings: Commenting[];
}

export interface UserGridUpdate {
  userId: string;
  postingGrid?: Omit<ContributionGrid, 'lastUpdated'> & { lastUpdated: SimpleTimestamp };
  commentingGrid?: Omit<ContributionGrid, 'lastUpdated'> & { lastUpdated: SimpleTimestamp };
  hasPostings: boolean;
  hasCommentings: boolean;
}

export interface BackfillResult {
  totalUsers: number;
  processedUsers: number;
  updatedUsers: number;
  skippedUsers: number;
  errorUsers: number;
  errors: Array<{ userId: string; error: string }>;
  executionTimeMs: number;
}

/**
 * Pure function to generate contribution grids for a user
 */
export function generateUserGrids(userData: UserData): UserGridUpdate {
  const { userId, postings, commentings } = userData;

  // Generate grids
  const now = new Date();
  const { start, end } = getWindowRange(now);

  const postingContributions = buildGridFromActivities(postings, start, end, ActivityType.POSTING);
  const commentingContributions = buildGridFromActivities(
    commentings,
    start,
    end,
    ActivityType.COMMENTING,
  );

  const postingGrid: Omit<ContributionGrid, 'lastUpdated'> & { lastUpdated: SimpleTimestamp } = {
    contributions: postingContributions,
    maxValue: Math.max(...postingContributions.map((c) => c.value), 0),
    lastUpdated: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    timeRange: {
      startDate: formatDate(start),
      endDate: formatDate(end),
    },
  };

  const commentingGrid: Omit<ContributionGrid, 'lastUpdated'> & { lastUpdated: SimpleTimestamp } = {
    contributions: commentingContributions,
    maxValue: Math.max(...commentingContributions.map((c) => c.value), 0),
    lastUpdated: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    timeRange: {
      startDate: formatDate(start),
      endDate: formatDate(end),
    },
  };

  return {
    userId,
    postingGrid,
    commentingGrid,
    hasPostings: postings.length > 0,
    hasCommentings: commentings.length > 0,
  };
}

/**
 * Pure function to process a batch of users
 */
export function processBatchUsers(
  userDataList: UserData[],
  batchNumber: number,
  totalBatches: number,
  skipExisting: boolean = true,
  existingGrids: Set<string> = new Set(),
): {
  updates: UserGridUpdate[];
  errors: Array<{ userId: string; error: string }>;
} {
  console.log(
    `[ContributionGridBackfill] Processing batch ${batchNumber}/${totalBatches}: ${userDataList.length} users`,
  );

  const updates: UserGridUpdate[] = [];
  const errors: Array<{ userId: string; error: string }> = [];

  for (const userData of userDataList) {
    try {
      // Check existing grids if skipExisting is true
      if (skipExisting) {
        const postingGridKey = `${userData.userId}_${ActivityType.POSTING}`;
        const commentingGridKey = `${userData.userId}_${ActivityType.COMMENTING}`;

        if (existingGrids.has(postingGridKey) && existingGrids.has(commentingGridKey)) {
          continue; // Skip this user
        }
      }

      const update = generateUserGrids(userData);
      updates.push(update);
    } catch (error) {
      errors.push({
        userId: userData.userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { updates, errors };
}

/**
 * Pure function to calculate backfill result
 */
export function calculateBackfillResult(
  totalUsers: number,
  processedUsers: number,
  updatedUsers: number,
  skippedUsers: number,
  errorUsers: number,
  errors: Array<{ userId: string; error: string }>,
  startTime: number,
): BackfillResult {
  return {
    totalUsers,
    processedUsers,
    updatedUsers,
    skippedUsers,
    errorUsers,
    errors,
    executionTimeMs: Date.now() - startTime,
  };
}
