import { Timestamp, type Transaction } from 'firebase-admin/firestore';
import { computeDayKey } from './computeDayKey';
import admin from '../../shared/admin';
import { Event, EventType } from '../types/Event';
import { EventMeta } from '../types/EventMeta';

const db = admin.firestore();

interface AppendPostCreatedParams {
  userId: string;
  postId: string;
  boardId: string;
  contentLength: number;
}

/**
 * Appends a PostCreated event to the user's event stream.
 * Uses a transaction to ensure:
 * - Monotonic seq allocation
 * - Correct dayKey computation from current user timezone
 * - Atomic write of event + lastSeq update
 */
export async function appendPostCreatedEvent(
  params: AppendPostCreatedParams,
): Promise<void> {
  const { userId, postId, boardId, contentLength } = params;

  await db.runTransaction(async (transaction: Transaction) => {
    const eventMetaRef = db.doc(`users/${userId}/eventMeta/meta`);
    const profileRef = db.doc(`users/${userId}`);

    const [eventMetaSnap, profileSnap] = await transaction.getAll(
      eventMetaRef,
      profileRef,
    );

    const eventMeta = eventMetaSnap.data() as EventMeta | undefined;
    const lastSeq = eventMeta?.lastSeq ?? 0;

    const timezone = profileSnap.data()?.profile?.timezone ?? 'Asia/Seoul';

    const seq = lastSeq + 1;

    const createdAt = Timestamp.now();
    const dayKey = computeDayKey(createdAt, timezone);

    const eventId = seq.toString().padStart(10, '0');
    const eventRef = db.doc(`users/${userId}/events/${eventId}`);

    const event: Event = {
      seq,
      type: EventType.POST_CREATED,
      createdAt,
      dayKey,
      payload: {
        postId,
        boardId,
        contentLength,
      },
    };

    transaction.set(eventRef, event);
    transaction.set(eventMetaRef, { lastSeq: seq }, { merge: true });
  });
}
