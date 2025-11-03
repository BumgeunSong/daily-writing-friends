import { addDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Timestamp } from 'firebase-admin/firestore';
import { loadDeltaEvents } from './loadDeltaEvents';
import { saveProjectionCache } from './saveProjectionCache';
import { applyEventsToPhase2Projection, createInitialPhase2Projection } from './streakReducerPhase2';
import admin from '../../shared/admin';
import { computeDayKey } from '../append/computeDayKey';
import { Event, EventType, DayActivityEvent, DayClosedVirtualEvent } from '../types/Event';
import { EventMeta } from '../types/EventMeta';
import { StreamProjectionPhase2 } from '../types/StreamProjectionPhase2';
import { isWorkingDayByTz, getEndOfDay } from '../utils/workingDayUtils';
import { HolidayMap } from '../types/Holiday';

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
 * @param holidayMap - Optional pre-fetched holiday map for working day checks
 * @returns Array of synthetic extension events
 */
async function synthesizeExtensionTicks(
  userId: string,
  lastEvaluatedDayKey: string,
  evaluationCutoff: string,
  appliedSeq: number,
  timezone: string,
  deltaEventsByDay: Map<string, Event[]>,
  holidayMap?: HolidayMap,
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

    // Only process working days (excludes weekends and holidays)
    if (!isWorkingDayByTz(dayKey, timezone, holidayMap)) {
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
      // Emit DAY_CLOSED_VIRTUAL (working day with 0 posts)
      const dayClosedVirtualEvent: DayClosedVirtualEvent = {
        seq: 0,
        type: EventType.DAY_CLOSED_VIRTUAL,
        dayKey,
        createdAt: Timestamp.fromMillis(endOfDayTimestamp.toMillis() + 1), // After activity
      };
      extensionTicks.push(dayClosedVirtualEvent);
    }
  }

  // Runtime guard: ensure never both DAY_ACTIVITY and DAY_CLOSED_VIRTUAL for same day
  if (process.env.NODE_ENV !== 'production') {
    const activityDays = new Set(
      extensionTicks
        .filter((e) => e.type === EventType.DAY_ACTIVITY)
        .map((e) => e.dayKey),
    );
    const closedDays = new Set(
      extensionTicks
        .filter((e) => e.type === EventType.DAY_CLOSED_VIRTUAL)
        .map((e) => e.dayKey),
    );

    activityDays.forEach((dayKey) => {
      if (closedDays.has(dayKey)) {
        throw new Error(
          `[INVARIANT] Both DAY_ACTIVITY and DAY_CLOSED_VIRTUAL emitted for dayKey=${dayKey}`,
        );
      }
    });
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
  // 3. Correct version (projectorVersion === 'phase2.1-no-crossday-v1')
  // 4. No delta events (prevents missing same-day additions)
  if (
    appliedSeq >= latestSeq &&
    lastEvaluatedDayKey === evaluationCutoff &&
    currentProjection.projectorVersion === 'phase2.1-no-crossday-v1' &&
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

  // Runtime guard: ensure lastEvaluatedDayKey moves forward with ticks
  if (process.env.NODE_ENV !== 'production' && lastEvaluatedDayKey) {
    const daysBetween = Math.abs(
      (parseISO(evaluationCutoff).getTime() - parseISO(lastEvaluatedDayKey).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // If jumping more than 1 day, ensure we have extension ticks covering the gap
    if (daysBetween > 1 && extensionTicks.length === 0 && deltaEvents.length === 0) {
      throw new Error(
        `[INVARIANT] lastEvaluatedDayKey jumped ${daysBetween} days (${lastEvaluatedDayKey} → ${evaluationCutoff}) without any ticks`,
      );
    }
  }

  // Update metadata
  newProjection.appliedSeq = Math.max(latestSeq, appliedSeq);
  newProjection.lastEvaluatedDayKey = evaluationCutoff;
  newProjection.projectorVersion = 'phase2.1-no-crossday-v1';

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
