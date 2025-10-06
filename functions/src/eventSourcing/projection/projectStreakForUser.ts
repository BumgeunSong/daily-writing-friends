import admin from '../../shared/admin';
import { Event } from '../types/Event';
import { StreamProjectionPhase1 } from '../types/StreamProjection';
import {
  applyEventsToProjection,
  createInitialProjection,
} from './streakReducer';
import { computeDayKey } from '../append/computeDayKey';
import { Timestamp, type Transaction, type QueryDocumentSnapshot } from 'firebase-admin/firestore';

const db = admin.firestore();

/**
 * Projects new events for a user into their streak_es/currentPhase1 document.
 * Idempotent and transactional - safe to retry.
 *
 * Process:
 * 1. Read current appliedSeq
 * 2. Fetch events where seq > appliedSeq (ordered, limited to 500)
 * 3. Apply events via pure reducer
 * 4. Write new state + updated appliedSeq in same transaction
 *
 * If no new events exist, transaction is a no-op (idempotency guarantee).
 */
export async function projectStreakForUser(userId: string): Promise<void> {
  await db.runTransaction(async (transaction: Transaction) => {
    const projectionRef = db.doc(`users/${userId}/streak_es/currentPhase1`);
    const projectionSnap = await transaction.get(projectionRef);

    const currentState: StreamProjectionPhase1 = projectionSnap.exists
      ? (projectionSnap.data() as StreamProjectionPhase1)
      : createInitialProjection();

    const eventsQuery = db
      .collection(`users/${userId}/events`)
      .where('seq', '>', currentState.appliedSeq)
      .orderBy('seq', 'asc')
      .limit(500);

    const eventsSnap = await transaction.get(eventsQuery);

    if (eventsSnap.empty) {
      return;
    }

    const events = eventsSnap.docs.map((doc: QueryDocumentSnapshot) => doc.data() as Event);

    const profileRef = db.doc(`users/${userId}`);
    const profileSnap = await transaction.get(profileRef);
    const timezone = profileSnap.data()?.profile?.timezone ?? 'Asia/Seoul';
    const todayDayKey = computeDayKey(Timestamp.now(), timezone);

    const newState = applyEventsToProjection(currentState, events, todayDayKey);

    transaction.set(projectionRef, newState);
  });
}
