import { Timestamp } from 'firebase-admin/firestore';
import { StreakInfo, RecoveryStatusType } from './StreakInfo';
import admin from '../shared/admin';
import { formatSeoulDate } from '../shared/calendar';

/**
 * Get or create streak info document for user
 */
export async function getOrCreateStreakInfo(
  userId: string,
): Promise<{ doc: FirebaseFirestore.DocumentReference; data: StreakInfo | null }> {
  const streakInfoRef = admin
    .firestore()
    .collection('users')
    .doc(userId)
    .collection('streakInfo')
    .doc('current');

  const doc = await streakInfoRef.get();

  if (!doc.exists) {
    // Create default streak info
    const defaultStreakInfo: StreakInfo = {
      lastContributionDate: formatSeoulDate(new Date()),
      lastCalculated: Timestamp.now(),
      status: {
        type: RecoveryStatusType.ON_STREAK,
      },
      currentStreak: 0,
      longestStreak: 0,
      originalStreak: 0,
    };

    await streakInfoRef.set(defaultStreakInfo);
    return { doc: streakInfoRef, data: defaultStreakInfo };
  }

  return { doc: streakInfoRef, data: doc.data() as StreakInfo };
}

/**
 * Update streak info document
 */
export async function updateStreakInfo(
  userId: string,
  updates: Partial<StreakInfo>,
): Promise<void> {
  const streakInfoRef = admin
    .firestore()
    .collection('users')
    .doc(userId)
    .collection('streakInfo')
    .doc('current');

  await streakInfoRef.update({
    ...updates,
    lastCalculated: Timestamp.now(),
  });
}
