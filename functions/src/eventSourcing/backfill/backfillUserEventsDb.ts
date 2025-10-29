import admin from '../../shared/admin';
import { WriteBatch } from 'firebase-admin/firestore';
import { Event, EventType } from '../types/Event';
import {
  PostingDocument,
  extractEventsFromPostings,
  filterDuplicateEvents,
  renumberEvents,
} from './extractEventsFromPostings';

const db = admin.firestore();

export interface BackfillStats {
  userId: string;
  postingsFound: number;
  eventsCreated: number;
  eventsSkipped: number;
  finalLastSeq: number;
  error?: string;
}

/**
 * Imperative Shell: Backfill events for a single user
 *
 * Process:
 * 1. Fetch user timezone
 * 2. Fetch all postings (ordered by createdAt)
 * 3. Fetch existing events to detect duplicates
 * 4. Extract new events (functional core)
 * 5. Write events in batches (max 500 per batch)
 * 6. Update eventMeta.lastSeq
 *
 * Idempotent: Safe to re-run - skips existing events
 */
export async function backfillUserEvents(userId: string): Promise<BackfillStats> {
  const stats: BackfillStats = {
    userId,
    postingsFound: 0,
    eventsCreated: 0,
    eventsSkipped: 0,
    finalLastSeq: 0,
  };

  try {
    // 1. Fetch user timezone
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      stats.error = 'User not found';
      return stats;
    }
    const timezone = userDoc.data()?.profile?.timezone ?? 'Asia/Seoul';

    // 2. Fetch all postings (ordered by createdAt ASC)
    const postingsSnapshot = await db
      .collection(`users/${userId}/postings`)
      .orderBy('createdAt', 'asc')
      .get();

    stats.postingsFound = postingsSnapshot.size;

    if (postingsSnapshot.empty) {
      console.log(`[Backfill] User ${userId}: No postings found`);
      return stats;
    }

    const postings = postingsSnapshot.docs.map(
      doc => doc.data() as PostingDocument
    );

    // 3. Fetch existing events to detect duplicates
    const existingEventsSnapshot = await db
      .collection(`users/${userId}/events`)
      .where('type', '==', EventType.POST_CREATED)
      .get();

    const existingPostIds = new Set<string>();
    for (const doc of existingEventsSnapshot.docs) {
      const event = doc.data() as Event;
      if (event.type === EventType.POST_CREATED) {
        existingPostIds.add(event.payload.postId);
      }
    }

    // 4. Extract events (functional core)
    const allEvents = extractEventsFromPostings(postings, timezone, 1);

    // Filter duplicates
    const newEvents = filterDuplicateEvents(allEvents, existingPostIds);

    // Calculate starting seq (after existing events)
    const existingSeqNumbers = existingEventsSnapshot.docs.map(
      doc => (doc.data() as Event).seq
    );
    const maxExistingSeq = existingSeqNumbers.length > 0
      ? Math.max(...existingSeqNumbers)
      : 0;

    // Renumber new events to append after existing
    const finalEvents = renumberEvents(newEvents, maxExistingSeq + 1);

    stats.eventsSkipped = allEvents.length - finalEvents.length;

    if (finalEvents.length === 0) {
      console.log(`[Backfill] User ${userId}: All events already exist`);
      return stats;
    }

    // 5. Write events in batches (Firestore limit: 500 writes per batch)
    const batchSize = 500;
    for (let i = 0; i < finalEvents.length; i += batchSize) {
      const batchEvents = finalEvents.slice(i, i + batchSize);
      await writeBatchEvents(userId, batchEvents);
    }

    stats.eventsCreated = finalEvents.length;
    stats.finalLastSeq = finalEvents[finalEvents.length - 1].seq;

    // 6. Update eventMeta.lastSeq
    await db.doc(`users/${userId}/eventMeta/meta`).set(
      { lastSeq: stats.finalLastSeq },
      { merge: true }
    );

    console.log(
      `[Backfill] User ${userId}: ✅ Created ${stats.eventsCreated} events ` +
      `(skipped ${stats.eventsSkipped} duplicates, final seq: ${stats.finalLastSeq})`
    );

  } catch (error) {
    stats.error = error instanceof Error ? error.message : String(error);
    console.error(`[Backfill] User ${userId}: ❌ Error:`, stats.error);
  }

  return stats;
}

/**
 * Helper: Write batch of events to Firestore
 */
async function writeBatchEvents(userId: string, events: Event[]): Promise<void> {
  const batch = db.batch();

  for (const event of events) {
    const eventId = event.seq.toString().padStart(10, '0');
    const eventRef = db.doc(`users/${userId}/events/${eventId}`);
    batch.set(eventRef, event);
  }

  await batch.commit();
}
