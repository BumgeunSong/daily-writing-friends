/**
 * Firestore Integration for Backfill Operations
 * 
 * Implements REQ-111: Writes, Dry-Run, and Response
 * Implements REQ-112: Determinism, Idempotency, and Live Conflicts
 * 
 * This module handles all Firestore database operations for both
 * dry-run and write modes, including batch processing and transactions.
 */

import admin from '../shared/admin';
import { 
  BackfillWrites,
  BackfillParams, 
  SimulationState,
  RecoveryEvent,
} from './types';

/**
 * Write backfill results to Firestore (or return dry-run data)
 */
export async function writeBackfillResults(
  params: BackfillParams,
  writes: BackfillWrites,
): Promise<{ writesPerformed: boolean; finalState: SimulationState; recoveryEvents: RecoveryEvent[] }> {
  if (params.dryRun) {
    // Dry-run mode: return data without writing
    return {
      writesPerformed: false,
      finalState: writes.streakInfo,
      recoveryEvents: writes.recoveryHistory,
    };
  }

  // Write mode: perform actual Firestore operations
  await updateStreakInfoTransaction(params.userId, writes.streakInfo);
  await deleteExistingRecoveryHistory(params.userId);
  await createRecoveryHistoryBatch(params.userId, writes.recoveryHistory);

  return {
    writesPerformed: true,
    finalState: writes.streakInfo,
    recoveryEvents: writes.recoveryHistory,
  };
}

/**
 * Update streakInfo in a Firestore transaction
 */
export async function updateStreakInfoTransaction(
  userId: string,
  streakInfo: SimulationState,
): Promise<void> {
  const firestore = admin.firestore();
  
  await firestore.runTransaction(async (transaction) => {
    const streakInfoRef = firestore
      .collection('users')
      .doc(userId)
      .collection('streakInfo')
      .doc('current');

    transaction.update(streakInfoRef, {
      status: streakInfo.status,
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      originalStreak: streakInfo.originalStreak,
      lastContributionDate: streakInfo.lastContributionDate,
      lastCalculated: streakInfo.lastCalculated,
    });
  });
}

/**
 * Delete all existing recovery history records
 */
export async function deleteExistingRecoveryHistory(userId: string): Promise<void> {
  const firestore = admin.firestore();
  const batch = firestore.batch();
  
  const recoveryHistoryRef = firestore
    .collection('users')
    .doc(userId)
    .collection('streakInfo')
    .doc('current')
    .collection('recoveryHistory');
    
  const existingDocs = await recoveryHistoryRef.get();
  
  existingDocs.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
}

/**
 * Create recovery history records in batches
 */
export async function createRecoveryHistoryBatch(
  userId: string,
  recoveryEvents: RecoveryEvent[],
): Promise<void> {
  if (!recoveryEvents.length) {
    return;
  }

  const firestore = admin.firestore();
  const recoveryHistoryRef = firestore
    .collection('users')
    .doc(userId)
    .collection('streakInfo')
    .doc('current')
    .collection('recoveryHistory');

  // Process in batches to avoid Firestore limits
  const batchSize = 500; // Firestore batch write limit
  
  for (let i = 0; i < recoveryEvents.length; i += batchSize) {
    const batch = firestore.batch();
    const batchEvents = recoveryEvents.slice(i, i + batchSize);
    
    batchEvents.forEach(event => {
      const docRef = recoveryHistoryRef.doc(event.recoveryId);
      batch.set(docRef, {
        missedDate: event.missedDate,
        recoveryDate: event.recoveryDate,
        postsRequired: event.postsRequired,
        postsWritten: event.postsWritten,
        successful: event.successful,
        recoveryId: event.recoveryId,
      });
    });
    
    await batch.commit();
  }
}

/**
 * Validate backfill writes before execution
 */
export function validateBackfillWrites(writes: BackfillWrites): void {
  // Validate streakInfo
  if (!writes.streakInfo) {
    throw new Error('Invalid streakInfo for write operation');
  }
  
  const { streakInfo } = writes;
  
  // Validate streak values are non-negative
  if (streakInfo.currentStreak < 0 || 
      streakInfo.longestStreak < 0 || 
      streakInfo.originalStreak < 0) {
    throw new Error('Streak values must be non-negative');
  }
  
  // Validate longestStreak consistency
  if (streakInfo.status.type === 'onStreak' && 
      streakInfo.longestStreak < streakInfo.currentStreak) {
    throw new Error('longestStreak cannot be less than currentStreak');
  }
  
  // Validate recovery events
  writes.recoveryHistory.forEach(event => {
    if (event.recoveryId && !/^[0-9a-f]{8}$/.test(event.recoveryId)) {
      throw new Error('Invalid recoveryId format');
    }
  });
}