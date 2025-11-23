import { backfillUserEvents, BackfillStats } from './backfillUserEventsDb';
import admin from '../../shared/admin';

const db = admin.firestore();

export interface AggregateStats {
  totalUsers: number;
  usersProcessed: number;
  totalEventsCreated: number;
  errors: string[];
  userStats: BackfillStats[];
}

/**
 * Backfill events for all users in batches
 *
 * @param batchSize - Number of users to process in parallel (default: 10)
 */
export async function backfillAllUsers(batchSize = 10): Promise<AggregateStats> {
  const stats: AggregateStats = {
    totalUsers: 0,
    usersProcessed: 0,
    totalEventsCreated: 0,
    errors: [],
    userStats: [],
  };

  // Fetch all user IDs
  const usersSnapshot = await db.collection('users').select().get();
  const userIds = usersSnapshot.docs.map(doc => doc.id);

  stats.totalUsers = userIds.length;
  console.log(`[Backfill] Starting backfill for ${stats.totalUsers} users`);

  // Process in batches
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(userId => backfillUserEvents(userId))
    );

    // Aggregate stats
    for (const result of results) {
      stats.userStats.push(result);
      stats.usersProcessed++;
      stats.totalEventsCreated += result.eventsCreated;

      if (result.error) {
        stats.errors.push(`${result.userId}: ${result.error}`);
      }
    }

    console.log(
      `[Backfill] Progress: ${Math.min(i + batchSize, userIds.length)}/${userIds.length} users ` +
      `(${stats.totalEventsCreated} events created)`
    );
  }

  console.log(`[Backfill] Complete: ${stats.totalEventsCreated} events created for ${stats.usersProcessed} users`);
  console.log(`[Backfill] Errors: ${stats.errors.length}`);

  return stats;
}
