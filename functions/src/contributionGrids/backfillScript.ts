import { onRequest } from 'firebase-functions/v2/https';
import admin from '../shared/admin';
import { ActivityType } from './types';
import { Posting } from '../postings/Posting';
import { Commenting } from '../commentings/Commenting';
import { processBatchUsers, UserData, UserGridUpdate, BackfillResult } from './backfillUtils';

// Use interfaces from backfillUtils

/**
 * Get all user IDs from the users collection
 */
async function getAllUserIds(): Promise<string[]> {
  const usersSnapshot = await admin.firestore().collection('users').get();
  return usersSnapshot.docs.map((doc) => doc.id);
}

/**
 * Check if user already has contribution grids
 */
async function checkExistingGrids(userId: string): Promise<{
  hasPostingGrid: boolean;
  hasCommentingGrid: boolean;
}> {
  const db = admin.firestore();

  const postingGridRef = db
    .collection('contributionGrids')
    .doc(`${userId}_${ActivityType.POSTING}`);
  const commentingGridRef = db
    .collection('contributionGrids')
    .doc(`${userId}_${ActivityType.COMMENTING}`);

  const [postingDoc, commentingDoc] = await Promise.all([
    postingGridRef.get(),
    commentingGridRef.get(),
  ]);

  return {
    hasPostingGrid: postingDoc.exists,
    hasCommentingGrid: commentingDoc.exists,
  };
}

/**
 * Get user's historical postings
 */
async function getUserPostings(userId: string): Promise<Posting[]> {
  const db = admin.firestore();
  const postingsSnapshot = await db.collection('users').doc(userId).collection('postings').get();

  return postingsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as unknown as Posting[];
}

/**
 * Get user's historical commentings
 */
async function getUserCommentings(userId: string): Promise<Commenting[]> {
  const db = admin.firestore();
  const commentingsSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('commentings')
    .get();

  return commentingsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as unknown as Commenting[];
}

/**
 * Process a batch of users to generate their contribution grids
 */
async function processBatchUsersWithFirebase(
  userIds: string[],
  batchNumber: number,
  totalBatches: number,
  skipExisting: boolean = true,
): Promise<{
  updates: UserGridUpdate[];
  errors: Array<{ userId: string; error: string }>;
}> {
  console.log(
    `[ContributionGridBackfill] Processing batch ${batchNumber}/${totalBatches}: ${userIds.length} users`,
  );

  const errors: Array<{ userId: string; error: string }> = [];

  // Get existing grids if skipExisting is true
  const existingGrids = new Set<string>();
  if (skipExisting) {
    for (const userId of userIds) {
      const { hasPostingGrid, hasCommentingGrid } = await checkExistingGrids(userId);
      if (hasPostingGrid) {
        existingGrids.add(`${userId}_${ActivityType.POSTING}`);
      }
      if (hasCommentingGrid) {
        existingGrids.add(`${userId}_${ActivityType.COMMENTING}`);
      }
    }
  }

  // Process users in parallel within the batch
  const results = await Promise.allSettled(
    userIds.map(async (userId) => {
      try {
        // Skip existing grid check - will be handled by pure function

        // Get user's historical data
        const [postings, commentings] = await Promise.all([
          getUserPostings(userId),
          getUserCommentings(userId),
        ]);

        const userData: UserData = {
          userId,
          postings,
          commentings,
        };

        return userData;
      } catch (error) {
        throw new Error(`User ${userId}: ${error instanceof Error ? error.message : error}`);
      }
    }),
  );

  // Collect user data and errors
  const userDataList: UserData[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const userId = userIds[i];

    if (result.status === 'fulfilled') {
      userDataList.push(result.value);
    } else {
      errors.push({
        userId,
        error: result.reason?.message || result.reason,
      });
    }
  }

  // Use pure function to process the data
  const pureResult = processBatchUsers(
    userDataList,
    batchNumber,
    totalBatches,
    skipExisting,
    existingGrids,
  );

  // Convert SimpleTimestamp to Firestore Timestamp
  const convertedUpdates = pureResult.updates.map((update) => ({
    ...update,
    postingGrid: update.postingGrid
      ? {
          ...update.postingGrid,
          lastUpdated: admin.firestore.Timestamp.fromMillis(
            update.postingGrid.lastUpdated.seconds * 1000,
          ),
        }
      : undefined,
    commentingGrid: update.commentingGrid
      ? {
          ...update.commentingGrid,
          lastUpdated: admin.firestore.Timestamp.fromMillis(
            update.commentingGrid.lastUpdated.seconds * 1000,
          ),
        }
      : undefined,
  }));

  return {
    updates: convertedUpdates,
    errors: [...errors, ...pureResult.errors],
  };
}

/**
 * Apply grid updates to Firestore using batched writes
 */
async function applyGridUpdates(updates: UserGridUpdate[]): Promise<void> {
  if (updates.length === 0) {
    console.log('[ContributionGridBackfill] No updates to apply');
    return;
  }

  const db = admin.firestore();
  const batchSize = 500; // Firestore batch limit

  // Split updates into batches
  for (let i = 0; i < updates.length; i += batchSize) {
    const batchUpdates = updates.slice(i, i + batchSize);
    const batch = db.batch();

    for (const update of batchUpdates) {
      // Add posting grid if exists
      if (update.postingGrid) {
        const postingGridRef = db
          .collection('contributionGrids')
          .doc(`${update.userId}_${ActivityType.POSTING}`);
        batch.set(postingGridRef, update.postingGrid);
      }

      // Add commenting grid if exists
      if (update.commentingGrid) {
        const commentingGridRef = db
          .collection('contributionGrids')
          .doc(`${update.userId}_${ActivityType.COMMENTING}`);
        batch.set(commentingGridRef, update.commentingGrid);
      }
    }

    await batch.commit();
    console.log(
      `[ContributionGridBackfill] Applied batch ${Math.floor(i / batchSize) + 1}: ${batchUpdates.length} updates`,
    );
  }
}

/**
 * Main backfill logic to generate contribution grids for all users
 */
export async function executeContributionGridBackfill(
  options: {
    dryRun?: boolean;
    maxUsers?: number;
    skipExisting?: boolean;
  } = {},
): Promise<BackfillResult> {
  const { dryRun = false, maxUsers, skipExisting = true } = options;
  const startTime = Date.now();
  console.log(
    `[ContributionGridBackfill] Starting contribution grid backfill... (dryRun: ${dryRun})`,
  );

  try {
    // Get all user IDs
    let userIds = await getAllUserIds();

    // Limit users if maxUsers is specified
    if (maxUsers && maxUsers > 0) {
      userIds = userIds.slice(0, maxUsers);
      console.log(`[ContributionGridBackfill] Limited to first ${maxUsers} users for testing`);
    }

    console.log(`[ContributionGridBackfill] Found ${userIds.length} users to process`);

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
    const allUpdates: UserGridUpdate[] = [];

    // Process each batch sequentially to control load
    for (let i = 0; i < userBatches.length; i++) {
      const { updates, errors } = await processBatchUsersWithFirebase(
        userBatches[i],
        i + 1,
        userBatches.length,
        skipExisting,
      );

      allUpdates.push(...updates);
      allErrors.push(...errors);
      totalProcessed += userBatches[i].length;

      // Apply updates for this batch (skip if dry run)
      if (!dryRun) {
        await applyGridUpdates(updates);
      } else {
        console.log(`[ContributionGridBackfill] DRY RUN: Would apply ${updates.length} updates`);
      }
      totalUpdated += updates.length;
      totalSkipped += userBatches[i].length - updates.length - errors.length;

      // Log progress
      console.log(
        `[ContributionGridBackfill] Batch ${i + 1} complete: ${updates.length} updated, ${errors.length} errors`,
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

    console.log('[ContributionGridBackfill] Backfill completed successfully:', {
      totalUsers: result.totalUsers,
      processedUsers: result.processedUsers,
      updatedUsers: result.updatedUsers,
      skippedUsers: result.skippedUsers,
      errorUsers: result.errorUsers,
      executionTimeMs: result.executionTimeMs,
    });

    return result;
  } catch (error) {
    console.error('[ContributionGridBackfill] Fatal error during backfill:', error);
    throw error;
  }
}

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
    console.log('[ContributionGridBackfill] HTTP function called with method:', req.method);

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

      console.log('[ContributionGridBackfill] Executing with options:', {
        dryRun,
        maxUsers,
        skipExisting,
      });

      const result = await executeContributionGridBackfill({ dryRun, maxUsers, skipExisting });

      res.status(200).json({
        success: true,
        message: 'Contribution grid backfill completed successfully',
        result: result,
      });
    } catch (error) {
      console.error('[ContributionGridBackfill] HTTP function error:', error);
      res.status(500).json({
        success: false,
        error: 'Backfill failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);
