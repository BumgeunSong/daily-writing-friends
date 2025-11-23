import admin from '../../shared/admin';
import { StreamProjectionPhase2 } from '../types/StreamProjectionPhase2';

const db = admin.firestore();

/**
 * Save projection cache to Firestore (write-behind pattern).
 *
 * Phase 2.1: Persists updated projection after on-demand computation.
 *
 * @param userId - User ID
 * @param projection - Computed projection state
 */
export async function saveProjectionCache(
  userId: string,
  projection: StreamProjectionPhase2,
): Promise<void> {
  await db.doc(`users/${userId}/streak_es/currentPhase2`).set(projection);
}
