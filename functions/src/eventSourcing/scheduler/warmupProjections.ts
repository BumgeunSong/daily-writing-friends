import { Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getActiveBoardId, getActiveUsers } from '../../commentStyle/userUtils';
import { computeUserStreakProjection } from '../projection/computeStreakProjection';

/**
 * Nightly warmup: precompute projections for active users at 00:05 KST.
 *
 * Phase 2.1: Replaces frequent scheduler-based projection updates.
 * Active users = users with write permission to the active board.
 *
 * Benefits:
 * - First app/admin read after midnight returns fast (cached)
 * - Reduces on-demand computation load during peak usage
 */
export const warmupStreakProjections = onSchedule(
  {
    schedule: '5 0 * * *', // 00:05 KST daily
    timeZone: 'Asia/Seoul',
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async () => {
    await processWarmupProjections();
  },
);

/**
 * Core warmup logic (extracted for testing).
 * Computes projection for all active users in batches to avoid overwhelming Firestore.
 *
 * Phase 2.1 no-crossday: Uses same compute function (computeUserStreakProjection),
 * which persists cache automatically via write-behind strategy.
 */
export async function processWarmupProjections(): Promise<void> {
  console.log('[Warmup] Starting streak projection warmup...');

  try {
    // Get active board and users
    const activeBoardId = await getActiveBoardId();
    const activeUserIds = await getActiveUsers(activeBoardId);

    console.log(`[Warmup] Found ${activeUserIds.length} active users for board ${activeBoardId}`);

    if (activeUserIds.length === 0) {
      console.log('[Warmup] No active users to process');
      return;
    }

    // Compute projections in batches (20 concurrent to avoid Firestore throttling)
    const BATCH_SIZE = 20;
    const now = Timestamp.now();
    const allResults: PromiseSettledResult<any>[] = [];

    for (let i = 0; i < activeUserIds.length; i += BATCH_SIZE) {
      const batch = activeUserIds.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((userId) => computeUserStreakProjection(userId, now)),
      );
      allResults.push(...batchResults);

      console.log(
        `[Warmup] Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(activeUserIds.length / BATCH_SIZE)} complete`,
      );
    }

    // Count successes and failures
    const succeeded = allResults.filter((r) => r.status === 'fulfilled').length;
    const failed = allResults.filter((r) => r.status === 'rejected').length;

    // Log failures
    allResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        const userId = activeUserIds[index];
        console.error(`[Warmup] Failed for user ${userId}:`, result.reason);
      }
    });

    console.log(`[Warmup] Complete: ${succeeded} succeeded, ${failed} failed`);
  } catch (error) {
    console.error('[Warmup] Fatal error:', error);
    throw error;
  }
}
