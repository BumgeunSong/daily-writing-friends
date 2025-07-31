import { onRequest } from 'firebase-functions/v2/https';
import { BackfillService, BackfillOptions } from '../services/backfillService';
import { ContributionGridService } from '../services/contributionGridService';
import { ContributionGridRepository } from '../repository/contributionGridRepository';
import { UserActivityRepository } from '../repository/userActivityRepository';

/**
 * Controller for Contribution Grid Backfill HTTP Functions
 * Handles HTTP requests for backfill operations
 */

// Initialize dependencies
const contributionGridRepository = new ContributionGridRepository();
const contributionGridService = new ContributionGridService(contributionGridRepository);
const userActivityRepository = new UserActivityRepository();
const backfillService = new BackfillService(userActivityRepository, contributionGridService);

/**
 * HTTP Cloud Function to execute contribution grid backfill
 * Call via: POST https://your-project.cloudfunctions.net/backfillContributionGrids
 *
 * Optional body parameters:
 * - dryRun: boolean (default: false) - Only calculate, don't update
 * - maxUsers: number (default: unlimited) - Limit number of users to process
 * - skipExisting: boolean (default: true) - Skip users that already have grids
 */
export const backfillContributionGrids = onRequest(
  {
    timeoutSeconds: 540, // 9 minutes (max for HTTP functions)
    memory: '1GiB',
  },
  async (req, res) => {
    console.log('[BackfillController] HTTP function called with method:', req.method);

    // Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({
        error: 'Method not allowed',
        message: 'Use POST to execute backfill',
      });
      return;
    }

    try {
      // Parse request body for options
      const { dryRun = false, maxUsers, skipExisting = true } = req.body || {};

      console.log('[BackfillController] Executing with options:', {
        dryRun,
        maxUsers,
        skipExisting,
      });

      const options: BackfillOptions = { dryRun, maxUsers, skipExisting };
      const result = await backfillService.executeBackfill(options);

      res.status(200).json({
        success: true,
        message: 'Contribution grid backfill completed successfully',
        result: result,
      });
    } catch (error) {
      console.error('[BackfillController] HTTP function error:', error);
      res.status(500).json({
        success: false,
        error: 'Backfill failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);