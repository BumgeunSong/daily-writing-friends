import admin from '../../shared/admin';
import { Event } from '../types/Event';
import { StreamProjectionPhase1 } from '../types/StreamProjection';
import { StreamProjectionPhase2 } from '../types/StreamProjectionPhase2';
import {
  applyEventsToProjection,
  createInitialProjection,
} from './streakReducer';
import {
  applyEventsToPhase2Projection,
  createInitialPhase2Projection,
} from './streakReducerPhase2';
import { computeDayKey } from '../append/computeDayKey';
import { Timestamp, type Transaction, type QueryDocumentSnapshot } from 'firebase-admin/firestore';

const db = admin.firestore();

/**
 * Projects new events for a user into their Phase 1 and Phase 2 projections.
 * Dual-write mode: updates both currentPhase1 and currentPhase2.
 * Idempotent and transactional - safe to retry.
 *
 * Process:
 * 1. Read current appliedSeq from both projections
 * 2. Fetch events where seq > min(appliedSeq) (ordered, limited to 500)
 * 3. Apply events via pure reducers (Phase 1 and Phase 2)
 * 4. Write new states in same transaction
 *
 * If no new events exist, transaction is a no-op (idempotency guarantee).
 */
export async function projectStreakForUser(userId: string): Promise<void> {
  await db.runTransaction(async (transaction: Transaction) => {
    // Read both Phase 1 and Phase 2 projections
    const phase1Ref = db.doc(`users/${userId}/streak_es/currentPhase1`);
    const phase2Ref = db.doc(`users/${userId}/streak_es/currentPhase2`);

    const [phase1Snap, phase2Snap] = await transaction.getAll(phase1Ref, phase2Ref);

    const phase1State: StreamProjectionPhase1 = phase1Snap.exists
      ? (phase1Snap.data() as StreamProjectionPhase1)
      : createInitialProjection();

    const phase2State: StreamProjectionPhase2 = phase2Snap.exists
      ? (phase2Snap.data() as StreamProjectionPhase2)
      : createInitialPhase2Projection();

    // Fetch events from the minimum appliedSeq
    const minAppliedSeq = Math.min(phase1State.appliedSeq, phase2State.appliedSeq);

    const eventsQuery = db
      .collection(`users/${userId}/events`)
      .where('seq', '>', minAppliedSeq)
      .orderBy('seq', 'asc')
      .limit(500);

    const eventsSnap = await transaction.get(eventsQuery);

    if (eventsSnap.empty) {
      return;
    }

    const events = eventsSnap.docs.map((doc: QueryDocumentSnapshot) => doc.data() as Event);

    // Get user timezone
    const profileRef = db.doc(`users/${userId}`);
    const profileSnap = await transaction.get(profileRef);
    const timezone = profileSnap.data()?.profile?.timezone ?? 'Asia/Seoul';
    const todayDayKey = computeDayKey(Timestamp.now(), timezone);

    // Apply events to both projections
    const newPhase1State = applyEventsToProjection(phase1State, events, todayDayKey);
    const newPhase2State = applyEventsToPhase2Projection(phase2State, events, timezone);

    // Write both projections
    transaction.set(phase1Ref, newPhase1State);
    transaction.set(phase2Ref, newPhase2State);

    console.log(
      `[Projector] Updated Phase1 (seq ${phase1State.appliedSeq} → ${newPhase1State.appliedSeq}) and Phase2 (seq ${phase2State.appliedSeq} → ${newPhase2State.appliedSeq}) for user ${userId}`,
    );
  });
}
