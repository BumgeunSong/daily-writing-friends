import { Timestamp } from 'firebase-admin/firestore';
import { addDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import admin from '../../shared/admin';
import { Event, EventType, DayActivityEvent, DayClosedEvent } from '../types/Event';
import { StreamProjectionPhase2 } from '../types/StreamProjectionPhase2';
import { EventMeta } from '../types/EventMeta';
import { computeDayKey } from '../append/computeDayKey';
import { applyEventsToPhase2Projection, createInitialPhase2Projection } from './streakReducerPhase2';
import { loadDeltaEvents } from './loadDeltaEvents';
import { saveProjectionCache } from './saveProjectionCache';
import { isWorkingDayByTz, getEndOfDay } from '../utils/workingDayUtils';

const db = admin.firestore();

/**
 * Check if user has posted on a specific day.
 * Queries events collection directly to avoid missing posts due to cache timing.
 *
 * @param userId - User ID
 * @param dayKey - Day key to check
 * @returns true if user has posted on that day
 */
async function checkHasPostedOnDay(userId: string, dayKey: string): Promise<boolean> {
  const eventsQuery = db
    .collection(`users/${userId}/events`)
    .where('dayKey', '==', dayKey)
    .where('type', '==', EventType.POST_CREATED)
    .limit(1);

  const snapshot = await eventsQuery.get();
  return !snapshot.empty;
}

/**
 * Synthesize extension ticks for days between lastEvaluatedDayKey and evaluationCutoff.
 * For each working day in the extension window:
 * - If day has posts (up to appliedSeq): emit DAY_ACTIVITY with postsCount
 * - If day has no posts: emit virtual DayClosed
 *
 * This allows the reducer to process cached events when extending the evaluation window.
 *
 * @param userId - User ID
 * @param lastEvaluatedDayKey - Last evaluated day (exclusive start)
 * @param evaluationCutoff - New cutoff day (inclusive end)
 * @param appliedSeq - Last applied sequence number
 * @param timezone - User's timezone
 * @param deltaEventsByDay - Map of dayKey to delta events (to avoid double-counting)
 * @returns Array of synthetic extension events
 */
async function synthesizeExtensionTicks(
  userId: string,
  lastEvaluatedDayKey: string,
  evaluationCutoff: string,
  appliedSeq: number,
  timezone: string,
  deltaEventsByDay: Map<string, Event[]>,
): Promise<Event[]> {
  if (!lastEvaluatedDayKey || lastEvaluatedDayKey >= evaluationCutoff) {
    return []; // No extension needed
  }

  const extensionTicks: Event[] = [];

  // Generate working days in extension window
  let currentDay = parseISO(lastEvaluatedDayKey);
  const endDay = parseISO(evaluationCutoff);

  while (currentDay < endDay) {
    currentDay = addDays(currentDay, 1);
    const dayKey = formatInTimeZone(currentDay, timezone, 'yyyy-MM-dd');

    if (dayKey > evaluationCutoff) break;

    // Only process working days
    if (!isWorkingDayByTz(dayKey, timezone)) {
      continue;
    }

    // Skip if this day has delta events (already being processed)
    if (deltaEventsByDay.has(dayKey)) {
      continue;
    }

    // Count posts on this day up to appliedSeq
    const postsQuery = db
      .collection(`users/${userId}/events`)
      .where('dayKey', '==', dayKey)
      .where('type', '==', EventType.POST_CREATED)
      .where('seq', '<=', appliedSeq);

    const postsSnap = await postsQuery.get();
    const postsCount = postsSnap.size;

    const endOfDayTimestamp = getEndOfDay(dayKey, timezone);

    if (postsCount >= 1) {
      // Emit DAY_ACTIVITY
      const dayActivityEvent: DayActivityEvent = {
        seq: 0, // Synthetic event has no seq
        type: EventType.DAY_ACTIVITY,
        dayKey,
        createdAt: endOfDayTimestamp,
        payload: { postsCount },
      };
      extensionTicks.push(dayActivityEvent);
    } else {
      // Emit virtual DayClosed
      const dayClosedEvent: DayClosedEvent = {
        seq: 0,
        type: EventType.DAY_CLOSED,
        dayKey,
        createdAt: Timestamp.fromMillis(endOfDayTimestamp.toMillis() + 1), // After activity
        idempotencyKey: `${userId}:${dayKey}:virtual`,
      };
      extensionTicks.push(dayClosedEvent);
    }
  }

  return extensionTicks;
}

/**
 * Compute user's streak projection on-demand with virtual DayClosed events.
 *
 * Phase 2.1 v2 - Optimistic Evaluation:
 * - If user posted today: evaluate up to today (immediate streak feedback)
 * - If user hasn't posted today: evaluate only up to yesterday (give them time)
 *
 * Workflow:
 * 1. Load cache (appliedSeq, lastEvaluatedDayKey)
 * 2. Load delta events since appliedSeq
 * 3. Determine optimistic cutoff based on today's posts
 * 4. Derive virtual closures for working days without posts (up to cutoff)
 * 5. Reduce events + virtual closures
 * 6. Persist updated cache (write-behind)
 * 7. Return projection immediately
 *
 * @param userId - User ID
 * @param now - Current server timestamp
 * @returns Computed projection state
 */
export async function computeUserStreakProjection(
  userId: string,
  now: Timestamp,
): Promise<StreamProjectionPhase2> {
  // Step 1: Load cache and metadata
  const cacheRef = db.doc(`users/${userId}/streak_es/currentPhase2`);
  const eventMetaRef = db.doc(`users/${userId}/eventMeta/meta`);
  const profileRef = db.doc(`users/${userId}`);

  const [cacheSnap, eventMetaSnap, profileSnap] = await Promise.all([
    cacheRef.get(),
    eventMetaRef.get(),
    profileRef.get(),
  ]);

  // Get current projection state
  const currentProjection: StreamProjectionPhase2 = cacheSnap.exists
    ? (cacheSnap.data() as StreamProjectionPhase2)
    : createInitialPhase2Projection();

  // Get user timezone
  const timezone = profileSnap.data()?.profile?.timezone ?? 'Asia/Seoul';

  // Get latest sequence number from eventMeta
  const eventMeta = eventMetaSnap.data() as EventMeta | undefined;
  const latestSeq = eventMeta?.lastSeq ?? 0;

  // Compute local dates
  const todayLocal = computeDayKey(now, timezone);
  const yesterdayLocal = formatInTimeZone(
    addDays(parseISO(todayLocal), -1),
    timezone,
    'yyyy-MM-dd',
  );

  // Step 2: Load delta events
  const appliedSeq = currentProjection.appliedSeq;
  const allDeltaEvents = await loadDeltaEvents(userId, appliedSeq);

  // Filter out old persisted DayClosed events (Phase 2 legacy)
  // Phase 2.1 derives virtual closures instead
  const deltaEvents = allDeltaEvents.filter((event) => event.type !== EventType.DAY_CLOSED);

  // Step 3: Determine optimistic evaluation cutoff
  // Check if user posted today by querying today's events directly
  // (deltaEvents may be empty if cache was updated before today's post)
  const hasPostedToday = await checkHasPostedOnDay(userId, todayLocal);
  const evaluationCutoff = hasPostedToday ? todayLocal : yesterdayLocal;

  // Check if projection is already up-to-date
  const lastEvaluatedDayKey = currentProjection.lastEvaluatedDayKey;

  // Cache is valid only if:
  // 1. No new events (appliedSeq >= latestSeq)
  // 2. Evaluation cutoff hasn't changed (lastEvaluatedDayKey === evaluationCutoff)
  // 3. Correct version (projectorVersion === 'phase2.1-v2')
  // 4. No delta events (prevents missing same-day additions)
  if (
    appliedSeq >= latestSeq &&
    lastEvaluatedDayKey === evaluationCutoff &&
    currentProjection.projectorVersion === 'phase2.1-v2' &&
    deltaEvents.length === 0
  ) {
    // Cache hit: no new events and already evaluated up to cutoff with correct version
    return currentProjection;
  }

  // Step 4: Group delta events by dayKey
  const eventsByDayKey = new Map<string, Event[]>();
  for (const event of deltaEvents) {
    const existing = eventsByDayKey.get(event.dayKey) || [];
    existing.push(event);
    eventsByDayKey.set(event.dayKey, existing);
  }

  // Step 5: Synthesize extension ticks if needed (seq-fresh but date-stale)
  const extensionTicks = await synthesizeExtensionTicks(
    userId,
    lastEvaluatedDayKey || '',
    evaluationCutoff,
    appliedSeq,
    timezone,
    eventsByDayKey,
  );

  // Step 6: Merge delta events and extension ticks, then sort
  const allEvents = [...deltaEvents, ...extensionTicks].sort((a, b) => {
    // Sort by dayKey first, then by createdAt (for same-day ordering)
    if (a.dayKey !== b.dayKey) {
      return a.dayKey.localeCompare(b.dayKey);
    }
    return a.createdAt.toMillis() - b.createdAt.toMillis();
  });

  // Step 7: Reduce events
  const newProjection = applyEventsToPhase2Projection(currentProjection, allEvents, timezone);

  // Update metadata
  newProjection.appliedSeq = Math.max(latestSeq, appliedSeq);
  newProjection.lastEvaluatedDayKey = evaluationCutoff;
  newProjection.projectorVersion = 'phase2.1-v2';

  // Step 6: Persist (write-behind)
  if (
    newProjection.appliedSeq > currentProjection.appliedSeq ||
    newProjection.lastEvaluatedDayKey !== currentProjection.lastEvaluatedDayKey ||
    JSON.stringify(newProjection.status) !== JSON.stringify(currentProjection.status)
  ) {
    await saveProjectionCache(userId, newProjection);
  }

  // Step 7: Return immediately
  return newProjection;
}
