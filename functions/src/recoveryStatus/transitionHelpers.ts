import { Timestamp } from 'firebase-admin/firestore';
import { StreakInfo, RecoveryStatusType } from './StreakInfo';

export interface DBUpdate {
  userId: string;
  updates: Partial<StreakInfo> & { lastCalculated: Timestamp };
  reason: string;
}


/**
 * Helper to validate user is in expected state
 */
export function validateUserState(
  streakInfo: StreakInfo | null,
  expectedState: RecoveryStatusType,
): boolean {
  return streakInfo?.status.type === expectedState;
}

/**
 * Helper to create base status update
 */
export function createBaseUpdate(
  userId: string,
  reason: string,
): Pick<DBUpdate, 'userId' | 'reason'> & { updates: { lastCalculated: Timestamp } } {
  return {
    userId,
    reason,
    updates: {
      lastCalculated: Timestamp.now(),
    },
  };
}

