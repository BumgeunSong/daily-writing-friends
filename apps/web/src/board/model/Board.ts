import type { FirebaseTimestamp } from '@/shared/model/Timestamp';

// src/types/Board.ts
export interface Board {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  firstDay?: FirebaseTimestamp;
  lastDay?: FirebaseTimestamp;
  cohort?: number;
  waitingUsersIds: string[];
}
