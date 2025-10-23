import { Timestamp } from 'firebase-admin/firestore';
import { addDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import admin from '../../shared/admin';
import { Event, EventType } from '../types/Event';
import { StreamProjectionPhase2 } from '../types/StreamProjectionPhase2';
import { EventMeta } from '../types/EventMeta';
import { computeDayKey } from '../append/computeDayKey';
import { applyEventsToPhase2Projection, createInitialPhase2Projection } from './streakReducerPhase2';
import { loadDeltaEvents } from './loadDeltaEvents';
import { deriveVirtualClosures } from './deriveVirtualClosures';
import { saveProjectionCache } from './saveProjectionCache';

const db = admin.firestore();

/**
 * Determines evaluation cutoff based on optimistic evaluation logic.
 * - If user has posted today → evaluate up to today (immediate feedback)
 * - If user hasn't posted today → evaluate only up to yesterday (optimistic)
 *
 * @param todayLocal - Today's dayKey in user's timezone
 * @param yesterdayLocal - Yesterday's dayKey in user's timezone
 * @param deltaEvents - Events to evaluate
 * @returns dayKey to evaluate up to
 */
function computeOptimisticCutoff(
  todayLocal: string,
  yesterdayLocal: string,
  deltaEvents: Event[],
): string {
  const hasPostsToday = deltaEvents.some(
    (event) => event.type === EventType.POST_CREATED && event.dayKey === todayLocal,
  );

  return hasPostsToday ? todayLocal : yesterdayLocal;
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
  const evaluationCutoff = computeOptimisticCutoff(todayLocal, yesterdayLocal, deltaEvents);

  // Check if projection is already up-to-date
  const lastEvaluatedDayKey = currentProjection.lastEvaluatedDayKey;

  if (appliedSeq >= latestSeq && lastEvaluatedDayKey === evaluationCutoff) {
    // Cache hit: no new events and already evaluated up to cutoff
    return currentProjection;
  }

  // Step 4: Derive virtual closures
  const startDayKey = lastEvaluatedDayKey || (deltaEvents[0]?.dayKey ?? evaluationCutoff);

  // Group delta events by dayKey for closure derivation
  const eventsByDayKey = new Map<string, Event[]>();
  for (const event of deltaEvents) {
    const existing = eventsByDayKey.get(event.dayKey) || [];
    existing.push(event);
    eventsByDayKey.set(event.dayKey, existing);
  }

  const virtualClosures = deriveVirtualClosures(
    startDayKey,
    evaluationCutoff,
    eventsByDayKey,
    timezone,
  );

  // Step 4: Merge delta events and virtual closures, then sort
  const allEvents = [...deltaEvents, ...virtualClosures].sort((a, b) => {
    // Sort by dayKey first, then by createdAt (for same-day ordering)
    if (a.dayKey !== b.dayKey) {
      return a.dayKey.localeCompare(b.dayKey);
    }
    return a.createdAt.toMillis() - b.createdAt.toMillis();
  });

  // Step 5: Reduce events
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
