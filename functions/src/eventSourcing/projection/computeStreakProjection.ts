import { Timestamp } from 'firebase-admin/firestore';
import { addDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import admin from '../../shared/admin';
import { Event } from '../types/Event';
import { StreamProjectionPhase2 } from '../types/StreamProjectionPhase2';
import { EventMeta } from '../types/EventMeta';
import { computeDayKey } from '../append/computeDayKey';
import { applyEventsToPhase2Projection, createInitialPhase2Projection } from './streakReducerPhase2';
import { loadDeltaEvents } from './loadDeltaEvents';
import { deriveVirtualClosures } from './deriveVirtualClosures';
import { saveProjectionCache } from './saveProjectionCache';

const db = admin.firestore();

/**
 * Compute user's streak projection on-demand with virtual DayClosed events.
 *
 * Phase 2.1 main workflow:
 * 1. Load cache (appliedSeq, lastEvaluatedDayKey)
 * 2. Load delta events since appliedSeq
 * 3. Derive virtual closures for working days without posts
 * 4. Reduce events + virtual closures
 * 5. Persist updated cache (write-behind)
 * 6. Return projection immediately
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

  // Check if projection is already up-to-date
  const appliedSeq = currentProjection.appliedSeq;
  const lastEvaluatedDayKey = currentProjection.lastEvaluatedDayKey;

  if (appliedSeq >= latestSeq && lastEvaluatedDayKey === yesterdayLocal) {
    // Cache hit: no new events and already evaluated up to yesterday
    return currentProjection;
  }

  // Step 2: Load delta events
  const deltaEvents = await loadDeltaEvents(userId, appliedSeq);

  // Step 3: Derive virtual closures
  const startDayKey = lastEvaluatedDayKey || (deltaEvents[0]?.dayKey ?? yesterdayLocal);

  // Group delta events by dayKey for closure derivation
  const eventsByDayKey = new Map<string, Event[]>();
  for (const event of deltaEvents) {
    const existing = eventsByDayKey.get(event.dayKey) || [];
    existing.push(event);
    eventsByDayKey.set(event.dayKey, existing);
  }

  const virtualClosures = deriveVirtualClosures(startDayKey, yesterdayLocal, eventsByDayKey, timezone);

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
  newProjection.lastEvaluatedDayKey = yesterdayLocal;
  newProjection.projectorVersion = 'phase2.1-v1';

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
