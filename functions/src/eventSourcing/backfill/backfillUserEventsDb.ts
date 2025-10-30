import {
  PostingDocument,
  extractEventsFromPostings,
} from './extractEventsFromPostings';
import admin from '../../shared/admin';
import { Event } from '../types/Event';

const db = admin.firestore();

export interface BackfillStats {
  userId: string;
  postingsFound: number;
  eventsCreated: number;
  finalLastSeq: number;
  error?: string;
}

/**
 * Imperative Shell: Backfill events for a single user (FULL REBUILD)
 *
 * Process:
 * 1. Fetch user timezone
 * 2. Fetch all postings (ordered by createdAt)
 * 3. Delete all existing events
 * 4. Extract events from postings (functional core)
 * 5. Write events in batches (chronologically ordered, seq starting from 1)
 * 6. Update eventMeta.lastSeq
 *
 * WARNING: This deletes and rebuilds the entire event stream.
 * All existing events (including DayClosed) will be removed.
 */
export async function backfillUserEvents(userId: string): Promise<BackfillStats> {
  const stats: BackfillStats = {
    userId,
    postingsFound: 0,
    eventsCreated: 0,
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

    // 3. Delete all existing events (full rebuild)
    await deleteAllEvents(userId);
    console.log(`[Backfill] User ${userId}: Deleted all existing events`);

    // 4. Extract events (functional core)
    const events = extractEventsFromPostings(postings, timezone, 1);

    if (events.length === 0) {
      console.log(`[Backfill] User ${userId}: No valid events to create`);
      return stats;
    }

    // 5. Write events in batches (Firestore limit: 500 writes per batch)
    const batchSize = 500;
    for (let i = 0; i < events.length; i += batchSize) {
      const batchEvents = events.slice(i, i + batchSize);
      await writeBatchEvents(userId, batchEvents);
    }

    stats.eventsCreated = events.length;
    stats.finalLastSeq = events[events.length - 1].seq;

    // 6. Update eventMeta.lastSeq
    await db.doc(`users/${userId}/eventMeta/meta`).set(
      { lastSeq: stats.finalLastSeq },
      { merge: true }
    );

    console.log(
      `[Backfill] User ${userId}: ✅ Rebuilt ${stats.eventsCreated} events ` +
      `(final seq: ${stats.finalLastSeq})`
    );

  } catch (error) {
    stats.error = error instanceof Error ? error.message : String(error);
    console.error(`[Backfill] User ${userId}: ❌ Error:`, stats.error);
  }

  return stats;
}

/**
 * Helper: Delete all events for a user
 */
async function deleteAllEvents(userId: string): Promise<void> {
  const eventsRef = db.collection(`users/${userId}/events`);
  const snapshot = await eventsRef.get();

  if (snapshot.empty) {
    return;
  }

  // Delete in batches (Firestore limit: 500 operations per batch)
  const batchSize = 500;
  const batches: FirebaseFirestore.WriteBatch[] = [];
  let currentBatch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    currentBatch.delete(doc.ref);
    batchCount++;

    if (batchCount === batchSize) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    batches.push(currentBatch);
  }

  // Commit all batches
  for (const batch of batches) {
    await batch.commit();
  }
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
