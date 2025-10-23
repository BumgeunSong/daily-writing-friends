import admin from '../../shared/admin';
import { Event } from '../types/Event';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

const db = admin.firestore();

/**
 * Load delta events for a user starting from a specific sequence number.
 * Handles pagination for large event backlogs (>1000 events).
 *
 * Phase 2.1: Used by on-demand projection to load events since last appliedSeq.
 *
 * @param userId - User ID
 * @param fromSeq - Starting sequence number (exclusive)
 * @returns Array of events ordered by seq (ascending)
 */
export async function loadDeltaEvents(userId: string, fromSeq: number): Promise<Event[]> {
  const allEvents: Event[] = [];
  let lastSeq = fromSeq;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    // Query next batch
    const eventsQuery = db
      .collection(`users/${userId}/events`)
      .where('seq', '>', lastSeq)
      .orderBy('seq', 'asc')
      .limit(batchSize);

    const eventsSnap = await eventsQuery.get();

    if (eventsSnap.empty) {
      hasMore = false;
      break;
    }

    // Convert to Event objects
    const batchEvents = eventsSnap.docs.map((doc: QueryDocumentSnapshot) => doc.data() as Event);
    allEvents.push(...batchEvents);

    // Update lastSeq for next iteration
    lastSeq = batchEvents[batchEvents.length - 1].seq;

    // If we got fewer than batchSize, we've reached the end
    if (eventsSnap.size < batchSize) {
      hasMore = false;
    }
  }

  return allEvents;
}
