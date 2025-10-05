import admin from '../../shared/admin';
import { onRequest } from 'firebase-functions/v2/https';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { addDays, parseISO } from 'date-fns';
import { appendDayClosedEvent } from '../append/appendDayClosedEvent';
import { projectStreakForUser } from '../projection/projectStreakForUser';
import { EventMeta } from '../types/EventMeta';

const db = admin.firestore();

/**
 * Process day boundaries for all users.
 * Called by Cloud Scheduler at various frequencies:
 * - Every 5 minutes (baseline)
 * - Every 1 minute during peak hours (22:00-01:00 KST)
 *
 * For each user:
 * 1. Compute yesterday's dayKey in user's timezone
 * 2. Check if lastClosedLocalDate < yesterday (with 10-min window)
 * 3. If yes: append DayClosed for all missing days sequentially
 * 4. Trigger projector for the user
 *
 * Idempotency: DayClosed events use idempotency key and lastClosedLocalDate check.
 */
export const processDayBoundariesHttp = onRequest(
  { timeoutSeconds: 540, memory: '512MiB' },
  async (req, res) => {
    try {
      console.log('[DayBoundary] Starting day boundary processing...');

      const usersSnapshot = await db.collection('users').get();
      let processedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const timezone = userData?.profile?.timezone ?? 'Asia/Seoul';

        try {
          const processed = await processUserDayBoundary(userId, timezone);
          if (processed) {
            processedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`[DayBoundary] Error processing user ${userId}:`, error);
          errorCount++;
        }
      }

      const summary = {
        success: true,
        totalUsers: usersSnapshot.size,
        processed: processedCount,
        skipped: skippedCount,
        errors: errorCount,
      };

      console.log('[DayBoundary] Processing complete:', summary);
      res.status(200).json(summary);
    } catch (error) {
      console.error('[DayBoundary] Fatal error:', error);
      res.status(500).json({ success: false, error: String(error) });
    }
  },
);

/**
 * Process day boundary for a single user.
 * Returns true if any DayClosed events were appended, false otherwise.
 */
async function processUserDayBoundary(userId: string, timezone: string): Promise<boolean> {
  // Get current time in user's timezone
  const now = new Date();
  const nowInUserTz = toZonedTime(now, timezone);
  const todayDayKey = formatInTimeZone(nowInUserTz, timezone, 'yyyy-MM-dd');

  // Compute yesterday's dayKey (with 10-min resilience window)
  // We want to close days up to yesterday
  const yesterdayDate = addDays(parseISO(todayDayKey), -1);
  const targetDayKey = formatInTimeZone(yesterdayDate, timezone, 'yyyy-MM-dd');

  // Read eventMeta to get lastClosedLocalDate
  const eventMetaRef = db.doc(`users/${userId}/eventMeta/meta`);
  const eventMetaSnap = await eventMetaRef.get();
  const eventMeta = eventMetaSnap.data() as EventMeta | undefined;

  const lastClosedLocalDate = eventMeta?.lastClosedLocalDate;

  // Determine which days need to be closed
  const daysToClose = getDaysToClose(lastClosedLocalDate, targetDayKey);

  if (daysToClose.length === 0) {
    // Already up to date
    return false;
  }

  // Append DayClosed events for missing days (sequentially for ordering)
  let anyAppended = false;
  for (const dayKey of daysToClose) {
    const appended = await appendDayClosedEvent({ userId, dayKey });
    if (appended) {
      anyAppended = true;
      console.log(`[DayBoundary] User ${userId}: closed day ${dayKey}`);
    }
  }

  // Trigger projector if any events were appended
  if (anyAppended) {
    await projectStreakForUser(userId);
    console.log(`[DayBoundary] User ${userId}: projector updated`);
  }

  return anyAppended;
}

/**
 * Get list of days that need to be closed (inclusive range from lastClosed+1 to targetDay).
 * Returns empty array if already up to date.
 *
 * @param lastClosedLocalDate - Last closed dayKey (YYYY-MM-DD) or undefined
 * @param targetDayKey - Target dayKey to close up to (YYYY-MM-DD)
 * @returns Array of dayKeys to close, in chronological order
 */
function getDaysToClose(lastClosedLocalDate: string | undefined, targetDayKey: string): string[] {
  if (!lastClosedLocalDate) {
    // No days closed yet - only close targetDayKey (don't backfill history)
    return [targetDayKey];
  }

  if (targetDayKey <= lastClosedLocalDate) {
    // Already up to date or target is in the past
    return [];
  }

  // Generate sequential days from lastClosed+1 to targetDayKey
  const days: string[] = [];
  let currentDate = addDays(parseISO(lastClosedLocalDate), 1);
  const targetDate = parseISO(targetDayKey);

  while (currentDate <= targetDate) {
    days.push(formatInTimeZone(currentDate, 'UTC', 'yyyy-MM-dd'));
    currentDate = addDays(currentDate, 1);
  }

  return days;
}
