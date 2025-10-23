import { Timestamp } from 'firebase-admin/firestore';

export type StreakStatusType = 'onStreak' | 'eligible' | 'missed';

export interface StreakStatus {
  type: StreakStatusType;
  postsRequired?: 1 | 2;
  currentPosts?: number;
  deadline?: Timestamp;
  missedDate?: Timestamp;
  missedPostDates?: string[]; // dayKeys of posts during missed period for rebuild tracking
}

export interface StreamProjectionPhase2 {
  status: StreakStatus;
  currentStreak: number;
  originalStreak: number;
  longestStreak: number;
  lastContributionDate: string | null; // dayKey of latest post (YYYY-MM-DD)
  appliedSeq: number; // Checkpoint for idempotency
  projectorVersion: string; // e.g., 'phase2-v1', 'phase2.1-v1'
  lastEvaluatedDayKey?: string; // Phase 2.1: Last local dayKey fully evaluated with virtual closures (YYYY-MM-DD)
}
