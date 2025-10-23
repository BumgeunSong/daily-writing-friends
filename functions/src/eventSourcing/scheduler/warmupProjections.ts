import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Timestamp } from 'firebase-admin/firestore';
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
 * Computes projection for all active users using Promise.allSettled.
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

    // Compute projections for all active users
    const now = Timestamp.now();
    const results = await Promise.allSettled(
      activeUserIds.map((userId) => computeUserStreakProjection(userId, now)),
    );

    // Count successes and failures
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Log failures
    results.forEach((result, index) => {
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
