import { addDays, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Timestamp } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { deriveVirtualClosures } from './deriveVirtualClosures';
import { explainStreakReducer } from './explainStreakReducer';
import { loadDeltaEvents } from './loadDeltaEvents';
import { createInitialPhase2Projection } from './streakReducerPhase2';
import { ExplainProjectionResponse, ExplainProjectionOptions } from './types/ExplainProjection';
import admin from '../../shared/admin';
import { computeDayKey } from '../append/computeDayKey';
import { Event, EventType } from '../types/Event';
import { EventMeta } from '../types/EventMeta';
import { StreamProjectionPhase2 } from '../types/StreamProjectionPhase2';
import { fetchHolidaysForDateRange } from '../utils/workingDayUtils';

const db = admin.firestore();

/**
 * HTTP endpoint for explaining streak projection step-by-step.
 * Useful for debugging and auditing projection state changes.
 *
 * Query Parameters:
 * - uid (required): User ID
 * - fromSeq (optional): Filter events from this sequence number (inclusive)
 * - toSeq (optional): Filter events to this sequence number (inclusive)
 * - includeEvents (optional): Include full event objects in response (default: false)
 *
 * Example:
 * GET /explainUserStreakProjection?uid=user123&fromSeq=10&toSeq=20&includeEvents=true
 */
export const explainUserStreakProjectionHttp = onRequest(
  {
    cors: true,
    timeoutSeconds: 60,
  },
  async (req, res) => {
    try {
      // Parse and validate parameters
      const uid = req.query.uid as string;
      if (!uid) {
        res.status(400).json({ error: 'Missing required parameter: uid' });
        return;
      }

      const options: ExplainProjectionOptions = {
        fromSeq: req.query.fromSeq ? parseInt(req.query.fromSeq as string, 10) : undefined,
        toSeq: req.query.toSeq ? parseInt(req.query.toSeq as string, 10) : undefined,
        includeEvents: req.query.includeEvents === 'true',
      };

      // Validate sequence range
      if (options.fromSeq !== undefined && isNaN(options.fromSeq)) {
        res.status(400).json({ error: 'Invalid fromSeq parameter' });
        return;
      }
      if (options.toSeq !== undefined && isNaN(options.toSeq)) {
        res.status(400).json({ error: 'Invalid toSeq parameter' });
        return;
      }
      if (
        options.fromSeq !== undefined &&
        options.toSeq !== undefined &&
        options.fromSeq > options.toSeq
      ) {
        res.status(400).json({ error: 'fromSeq cannot be greater than toSeq' });
        return;
      }

      // Load projection state and compute explanation
      const explanation = await explainUserStreakProjection(uid, Timestamp.now(), options);

      // Optionally include events
      if (options.includeEvents) {
        // Load actual events for the sequence range
        const events = await loadEventsForExplanation(
          uid,
          options.fromSeq ?? 0,
          options.toSeq ?? Number.MAX_SAFE_INTEGER,
        );

        const enrichedExplanations = explanation.eventExplanations.map((exp) => {
          const event = events.find((e) => e.seq === exp.seq);
          return { ...exp, event };
        });

        res.json({
          ...explanation,
          eventExplanations: enrichedExplanations,
        });
      } else {
        res.json(explanation);
      }
    } catch (error) {
      console.error('Error explaining projection:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * Core logic to explain streak projection step-by-step.
 * Similar to computeUserStreakProjection but returns explanation instead of final state.
 */
async function explainUserStreakProjection(
  userId: string,
  now: Timestamp,
  options: ExplainProjectionOptions = {},
): Promise<ExplainProjectionResponse> {
  // Load cache and metadata
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
  const yesterdayLocal = formatInTimeZone(addDays(parseISO(todayLocal), -1), timezone, 'yyyy-MM-dd');

  // Fetch holidays for date range (4 weeks ago to today)
  // This covers typical evaluation windows for streak calculations
  const fourWeeksAgo = formatInTimeZone(
    addDays(parseISO(todayLocal), -28),
    timezone,
    'yyyy-MM-dd',
  );
  const holidayMap = await fetchHolidaysForDateRange(fourWeeksAgo, todayLocal);

  // Load delta events
  // Default to 0 to explain from beginning, not from cached appliedSeq
  const fromSeq = options.fromSeq ?? 0;
  const targetSeq = options.toSeq ?? latestSeq;

  const allDeltaEvents = await loadDeltaEvents(userId, fromSeq);

  // Filter out old persisted DayClosed events and apply sequence range
  const deltaEvents = allDeltaEvents
    .filter((event) => event.type !== EventType.DAY_CLOSED)
    .filter((event) => event.seq > fromSeq && event.seq <= targetSeq);

  // Derive virtual closures
  // When explaining from beginning (fromSeq not specified), start from first event
  // Otherwise, use the cached lastEvaluatedDayKey
  const startDayKey = options.fromSeq === undefined
    ? (deltaEvents[0]?.dayKey ?? yesterdayLocal)
    : (currentProjection.lastEvaluatedDayKey || (deltaEvents[0]?.dayKey ?? yesterdayLocal));

  const eventsByDayKey = new Map<string, Event[]>();
  for (const event of deltaEvents) {
    const existing = eventsByDayKey.get(event.dayKey) || [];
    existing.push(event);
    eventsByDayKey.set(event.dayKey, existing);
  }

  const virtualClosures = deriveVirtualClosures(startDayKey, yesterdayLocal, eventsByDayKey, timezone, holidayMap);

  // Merge delta events and virtual closures, then sort
  const allEvents = [...deltaEvents, ...virtualClosures].sort((a, b) => {
    if (a.dayKey !== b.dayKey) {
      return a.dayKey.localeCompare(b.dayKey);
    }
    return a.createdAt.toMillis() - b.createdAt.toMillis();
  });

  // Generate explanation
  // When explaining from beginning, start with initial state
  const initialState = options.fromSeq === undefined
    ? createInitialPhase2Projection()
    : currentProjection;

  return explainStreakReducer(initialState, allEvents, timezone, holidayMap);
}

/**
 * Load events for enriching explanation with full event data.
 */
async function loadEventsForExplanation(
  userId: string,
  fromSeq: number,
  toSeq: number,
): Promise<Event[]> {
  const eventsQuery = db
    .collection(`users/${userId}/events`)
    .where('seq', '>', fromSeq)
    .where('seq', '<=', toSeq)
    .orderBy('seq', 'asc');

  const eventsSnap = await eventsQuery.get();
  return eventsSnap.docs.map((doc) => doc.data() as Event);
}
