import { type Transaction, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import {
  applyEventsToPhase2Projection,
  createInitialPhase2Projection,
} from './streakReducerPhase2';
import admin from '../../shared/admin';
import { Event } from '../types/Event';
import { StreamProjectionPhase2 } from '../types/StreamProjectionPhase2';

const db = admin.firestore();

/**
 * Projects new events for a user into their Phase 2 projection.
 * Phase 3: Phase 1 removed - only Phase 2 canonical projection.
 * Idempotent and transactional - safe to retry.
 *
 * Process:
 * 1. Read current appliedSeq from Phase 2 projection
 * 2. Fetch events where seq > appliedSeq (ordered, limited to 500)
 * 3. Apply events via pure reducer (Phase 2)
 * 4. Write new state in same transaction
 *
 * Single-batch approach:
 * - Processes up to 500 events per invocation
 * - Scheduler (every 5 min) provides natural batching for backlogs
 * - Simpler, bounded execution time, lower timeout risk
 *
 * If projection becomes too slow to catch up (e.g., >500 event backlogs common):
 * - Add loop to process multiple batches per invocation
 * - Add safety limit (e.g., max 100 iterations = 50k events)
 * - Log warnings if max iterations hit
 *
 * If no new events exist, transaction is a no-op (idempotency guarantee).
 */
export async function projectStreakForUser(userId: string): Promise<void> {
  await db.runTransaction(async (transaction: Transaction) => {
    const phase2Ref = db.doc(`users/${userId}/streak_es/currentPhase2`);
    const phase2Snap = await transaction.get(phase2Ref);

    const phase2State: StreamProjectionPhase2 = phase2Snap.exists
      ? (phase2Snap.data() as StreamProjectionPhase2)
      : createInitialPhase2Projection();

    // Fetch events from current appliedSeq
    const eventsQuery = db
      .collection(`users/${userId}/events`)
      .where('seq', '>', phase2State.appliedSeq)
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

    // Apply events to Phase 2 projection
    const newPhase2State = applyEventsToPhase2Projection(phase2State, events, timezone);

    // Write Phase 2 projection only
    transaction.set(phase2Ref, newPhase2State);

    console.log(
      `[Projector] Updated Phase2 projection (seq ${phase2State.appliedSeq} → ${newPhase2State.appliedSeq}) for user ${userId}`,
    );
  });
}
