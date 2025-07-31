import { Timestamp } from 'firebase-admin/firestore';
import { ContributionGrid, ActivityType, SimpleTimestamp } from '../domain/models';
import { buildGridFromActivitiesWithRange, getWindowRange, formatDate } from '../domain/gridCalculator';
import { UserActivityRepository } from '../repository/userActivityRepository';
import { ContributionGridService } from './contributionGridService';
import { Posting } from '../../postings/Posting';
import { Commenting } from '../../commentings/Commenting';

/**
 * Data Transfer Objects for Backfill Operations
 */
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

export interface BackfillOptions {
  dryRun?: boolean;
  maxUsers?: number;
  skipExisting?: boolean;
}

/**
 * Service for Contribution Grid Backfill Operations
 * Handles bulk processing of historical user data to generate contribution grids
 */
export class BackfillService {
  constructor(
    private userActivityRepository: UserActivityRepository,
    private contributionGridService: ContributionGridService,
  ) {}

  /**
   * Pure function to generate contribution grids for a user
   */
  private generateUserGrids(userData: UserData): UserGridUpdate {
    const { userId, postings, commentings } = userData;

    // Generate grids
    const now = new Date();
    const dateRange = getWindowRange(now);

    const postingContributions = buildGridFromActivitiesWithRange(
      postings,
      dateRange,
      ActivityType.POSTING,
    );
    const commentingContributions = buildGridFromActivitiesWithRange(
      commentings,
      dateRange,
      ActivityType.COMMENTING,
    );

    const postingGrid: Omit<ContributionGrid, 'lastUpdated'> & { lastUpdated: SimpleTimestamp } = {
      contributions: postingContributions,
      maxValue: Math.max(...postingContributions.map((c: any) => c.value), 0),
      lastUpdated: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
      timeRange: {
        startDate: formatDate(dateRange.start),
        endDate: formatDate(dateRange.end),
      },
    };

    const commentingGrid: Omit<ContributionGrid, 'lastUpdated'> & { lastUpdated: SimpleTimestamp } = {
      contributions: commentingContributions,
      maxValue: Math.max(...commentingContributions.map((c: any) => c.value), 0),
      lastUpdated: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
      timeRange: {
        startDate: formatDate(dateRange.start),
        endDate: formatDate(dateRange.end),
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
   * Process a batch of users to generate their contribution grids
   */
  private async processBatchUsers(
    userIds: string[],
    batchNumber: number,
    totalBatches: number,
    skipExisting: boolean = true,
  ): Promise<{
    updates: UserGridUpdate[];
    errors: Array<{ userId: string; error: string }>;
  }> {
    console.log(
      `[BackfillService] Processing batch ${batchNumber}/${totalBatches}: ${userIds.length} users`,
    );

    const errors: Array<{ userId: string; error: string }> = [];

    // Get existing grids if skipExisting is true
    const existingGrids = new Set<string>();
    if (skipExisting) {
      for (const userId of userIds) {
        const { hasPostingGrid, hasCommentingGrid } =
          await this.contributionGridService.checkExistingGrids(userId);
        if (hasPostingGrid) {
          existingGrids.add(`${userId}_${ActivityType.POSTING}`);
        }
        if (hasCommentingGrid) {
          existingGrids.add(`${userId}_${ActivityType.COMMENTING}`);
        }
      }
    }

    // Get user data in batch
    const userDataList = await this.userActivityRepository.getBatchUserActivities(userIds);

    // Process users
    const updates: UserGridUpdate[] = [];
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

        const update = this.generateUserGrids(userData);
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
   * Apply grid updates to database
   */
  private async applyGridUpdates(updates: UserGridUpdate[]): Promise<void> {
    if (updates.length === 0) {
      console.log('[BackfillService] No updates to apply');
      return;
    }

    const batchUpdates: Array<{
      userId: string;
      activityType: ActivityType;
      grid: ContributionGrid;
    }> = [];

    for (const update of updates) {
      // Add posting grid if exists
      if (update.postingGrid) {
        batchUpdates.push({
          userId: update.userId,
          activityType: ActivityType.POSTING,
          grid: {
            ...update.postingGrid,
            lastUpdated: Timestamp.fromMillis(update.postingGrid.lastUpdated.seconds * 1000),
          },
        });
      }

      // Add commenting grid if exists
      if (update.commentingGrid) {
        batchUpdates.push({
          userId: update.userId,
          activityType: ActivityType.COMMENTING,
          grid: {
            ...update.commentingGrid,
            lastUpdated: Timestamp.fromMillis(update.commentingGrid.lastUpdated.seconds * 1000),
          },
        });
      }
    }

    await this.contributionGridService.batchSaveGrids(batchUpdates);
  }

  /**
   * Execute contribution grid backfill for all users
   */
  async executeBackfill(options: BackfillOptions = {}): Promise<BackfillResult> {
    const { dryRun = false, maxUsers, skipExisting = true } = options;
    const startTime = Date.now();
    
    console.log(
      `[BackfillService] Starting contribution grid backfill... (dryRun: ${dryRun})`,
    );

    try {
      // Get all user IDs
      let userIds = await this.userActivityRepository.getAllUserIds();

      // Limit users if maxUsers is specified
      if (maxUsers && maxUsers > 0) {
        userIds = userIds.slice(0, maxUsers);
        console.log(`[BackfillService] Limited to first ${maxUsers} users for testing`);
      }

      console.log(`[BackfillService] Found ${userIds.length} users to process`);

      if (userIds.length === 0) {
        return {
          totalUsers: 0,
          processedUsers: 0,
          updatedUsers: 0,
          skippedUsers: 0,
          errorUsers: 0,
          errors: [],
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Process users in batches of 20 to avoid overwhelming the system
      const batchSize = 20;
      const userBatches = [];
      for (let i = 0; i < userIds.length; i += batchSize) {
        userBatches.push(userIds.slice(i, i + batchSize));
      }

      let totalProcessed = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      const allErrors: Array<{ userId: string; error: string }> = [];

      // Process each batch sequentially to control load
      for (let i = 0; i < userBatches.length; i++) {
        const { updates, errors } = await this.processBatchUsers(
          userBatches[i],
          i + 1,
          userBatches.length,
          skipExisting,
        );

        allErrors.push(...errors);
        totalProcessed += userBatches[i].length;

        // Apply updates for this batch (skip if dry run)
        if (!dryRun) {
          await this.applyGridUpdates(updates);
        } else {
          console.log(`[BackfillService] DRY RUN: Would apply ${updates.length} updates`);
        }
        
        totalUpdated += updates.length;
        totalSkipped += userBatches[i].length - updates.length - errors.length;

        // Log progress
        console.log(
          `[BackfillService] Batch ${i + 1} complete: ${updates.length} updated, ${errors.length} errors`,
        );
      }

      const result: BackfillResult = {
        totalUsers: userIds.length,
        processedUsers: totalProcessed,
        updatedUsers: totalUpdated,
        skippedUsers: totalSkipped,
        errorUsers: allErrors.length,
        errors: allErrors,
        executionTimeMs: Date.now() - startTime,
      };

      console.log('[BackfillService] Backfill completed successfully:', {
        totalUsers: result.totalUsers,
        processedUsers: result.processedUsers,
        updatedUsers: result.updatedUsers,
        skippedUsers: result.skippedUsers,
        errorUsers: result.errorUsers,
        executionTimeMs: result.executionTimeMs,
      });

      return result;
    } catch (error) {
      console.error('[BackfillService] Fatal error during backfill:', error);
      throw error;
    }
  }
}