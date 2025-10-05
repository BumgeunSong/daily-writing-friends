import { Timestamp } from 'firebase-admin/firestore';

export type StreakStatusType = 'onStreak' | 'eligible' | 'missed';

export interface StreakStatus {
  type: StreakStatusType;
  postsRequired?: 1 | 2;
  currentPosts?: number;
  deadline?: Timestamp;
  missedDate?: Timestamp;
}

export interface StreamProjectionPhase2 {
  status: StreakStatus;
  currentStreak: number;
  originalStreak: number;
  longestStreak: number;
  lastContributionDate: string | null; // dayKey of latest post (YYYY-MM-DD)
  appliedSeq: number; // Checkpoint for idempotency
  projectorVersion: string; // e.g., 'phase2-v1'
}
