import { Timestamp, type Transaction } from 'firebase-admin/firestore';
import admin from '../../shared/admin';
import { Event, EventType } from '../types/Event';
import { EventMeta } from '../types/EventMeta';

const db = admin.firestore();

interface AppendDayClosedParams {
  userId: string;
  dayKey: string; // YYYY-MM-DD to close
}

/**
 * Appends a DayClosed event to the user's event stream.
 * Uses idempotency via lastClosedLocalDate to prevent duplicates.
 *
 * Process:
 * 1. Read eventMeta to get lastClosedLocalDate
 * 2. If dayKey <= lastClosedLocalDate, skip (already closed)
 * 3. Allocate monotonic seq
 * 4. Write DayClosed event with idempotencyKey
 * 5. Update lastClosedLocalDate
 *
 * @param params - { userId, dayKey }
 * @returns true if event was appended, false if already closed
 */
export async function appendDayClosedEvent(params: AppendDayClosedParams): Promise<boolean> {
  const { userId, dayKey } = params;

  const appended = await db.runTransaction(async (transaction: Transaction) => {
    const eventMetaRef = db.doc(`users/${userId}/eventMeta/meta`);
    const eventMetaSnap = await transaction.get(eventMetaRef);

    const eventMeta = eventMetaSnap.data() as EventMeta | undefined;
    const lastClosedLocalDate = eventMeta?.lastClosedLocalDate;

    // Idempotency check: if already closed this day or later, skip
    if (lastClosedLocalDate && dayKey <= lastClosedLocalDate) {
      console.log(
        `[DayClosed] Skip: dayKey ${dayKey} already closed (lastClosed: ${lastClosedLocalDate}) for user ${userId}`,
      );
      return false;
    }

    // Allocate monotonic seq
    const lastSeq = eventMeta?.lastSeq ?? 0;
    const seq = lastSeq + 1;

    // Create DayClosed event
    const eventId = seq.toString().padStart(10, '0');
    const eventRef = db.doc(`users/${userId}/events/${eventId}`);
    const idempotencyKey = `${userId}:${dayKey}:closed`;

    const event: Event = {
      seq,
      type: EventType.DAY_CLOSED,
      createdAt: Timestamp.now(),
      dayKey,
      idempotencyKey,
    };

    transaction.set(eventRef, event);

    // Update eventMeta with new lastSeq and lastClosedLocalDate
    transaction.set(
      eventMetaRef,
      {
        lastSeq: seq,
        lastClosedLocalDate: dayKey,
      },
      { merge: true },
    );

    console.log(`[DayClosed] Appended event seq=${seq} for user ${userId}, dayKey=${dayKey}`);
    return true;
  });

  return appended;
}
