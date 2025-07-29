import { ContributionGrid, ActivityType, ContributionGridUpdate } from '../domain/models';
import { ContributionGridRepository } from '../repository/contributionGridRepository';
import { Posting } from '../../postings/Posting';
import { Commenting } from '../../commentings/Commenting';
import {
  calculatePostingContributionResult,
  calculateCommentingContributionResult,
  calculateUpdatedGrid,
  shouldProcessUpdate,
  validateContributionUpdate,
  calculateBatchResult,
} from './contributionGridBusinessLogic';

/**
 * Service for Contribution Grid Operations
 * Orchestrates business logic using pure functions and handles side effects
 */
export class ContributionGridService {
  constructor(private repository: ContributionGridRepository) {}

  /**
   * Get existing contribution grid for a user and activity type
   */
  async getGrid(userId: string, activityType: ActivityType): Promise<ContributionGrid | null> {
    return await this.repository.getGrid(userId, activityType);
  }

  /**
   * Process posting contribution and update grid
   */
  async processPostingContribution(userId: string, postingData: Posting): Promise<{
    success: boolean;
    error?: string;
  }> {
    console.log(`[ContributionGridService] Processing posting contribution for user: ${userId}`);

    try {
      // Get existing grid (side effect)
      const existingGrid = await this.repository.getGrid(userId, ActivityType.POSTING);

      // Calculate update using pure business logic
      const result = calculatePostingContributionResult(userId, postingData, existingGrid);

      if (!result.success) {
        console.error(`[ContributionGridService] Failed to calculate posting contribution: ${result.error}`);
        return { success: false, error: result.error };
      }

      if (result.update) {
        // Apply update (side effect)
        const applyResult = await this.applyContributionGridUpdate(result.update);
        if (!applyResult.success) {
          return { success: false, error: applyResult.error };
        }

        console.log(
          `[ContributionGridService] Successfully processed posting contribution for user: ${userId}`,
        );
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[ContributionGridService] Error processing posting contribution for user ${userId}:`,
        error,
      );
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Process commenting contribution and update grid
   */
  async processCommentingContribution(userId: string, commentingData: Commenting): Promise<{
    success: boolean;
    error?: string;
  }> {
    console.log(`[ContributionGridService] Processing commenting contribution for user: ${userId}`);

    try {
      // Get existing grid (side effect)
      const existingGrid = await this.repository.getGrid(userId, ActivityType.COMMENTING);

      // Calculate update using pure business logic
      const result = calculateCommentingContributionResult(userId, commentingData, existingGrid);

      if (!result.success) {
        console.error(`[ContributionGridService] Failed to calculate commenting contribution: ${result.error}`);
        return { success: false, error: result.error };
      }

      if (result.update) {
        // Apply update (side effect)
        const applyResult = await this.applyContributionGridUpdate(result.update);
        if (!applyResult.success) {
          return { success: false, error: applyResult.error };
        }

        console.log(
          `[ContributionGridService] Successfully processed commenting contribution for user: ${userId}`,
        );
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(
        `[ContributionGridService] Error processing commenting contribution for user ${userId}:`,
        error,
      );
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Apply contribution grid update to database
   */
  private async applyContributionGridUpdate(update: ContributionGridUpdate): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Validate update using pure function
      const validation = validateContributionUpdate(update);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid update: ${validation.errors.join(', ')}`,
        };
      }

      // Get current grid (side effect)
      const currentGrid = await this.repository.getGrid(update.userId, update.activityType);
      
      // Check if update should be processed using pure function
      const shouldProcess = shouldProcessUpdate(update, currentGrid);
      if (!shouldProcess.shouldProcess) {
        console.log(`[ContributionGridService] Skipping update: ${shouldProcess.reason}`);
        return { success: true }; // Not an error, just no action needed
      }

      // Calculate updated grid using pure function
      const updatedGrid = calculateUpdatedGrid(update, currentGrid);

      // Save to repository (side effect)
      await this.repository.saveGrid(update.userId, update.activityType, updatedGrid);

      console.log(`[ContributionGridService] Successfully applied update: ${update.reason}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ContributionGridService] Error applying contribution grid update:`, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Check if grids exist for a user
   */
  async checkExistingGrids(userId: string): Promise<{
    hasPostingGrid: boolean;
    hasCommentingGrid: boolean;
  }> {
    return await this.repository.checkExistingGrids(userId);
  }

  /**
   * Batch save multiple grids (used by backfill operations)
   */
  async batchSaveGrids(updates: Array<{
    userId: string;
    activityType: ActivityType;
    grid: ContributionGrid;
  }>): Promise<{
    success: boolean;
    result?: {
      totalUpdates: number;
      postingUpdates: number;
      commentingUpdates: number;
      userCount: number;
    };
    error?: string;
  }> {
    try {
      // Calculate batch statistics using pure function
      const batchResult = calculateBatchResult(updates);

      // Perform batch save (side effect)
      await this.repository.batchSaveGrids(updates);

      console.log(`[ContributionGridService] Successfully saved ${batchResult.totalUpdates} grids for ${batchResult.userCount} users`);
      
      return {
        success: true,
        result: batchResult,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ContributionGridService] Error in batch save:`, error);
      return { success: false, error: errorMessage };
    }
  }
}