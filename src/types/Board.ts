import { Timestamp } from "firebase/firestore";

// src/types/Board.ts
export interface Board {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  firstDay?: Timestamp;
  cohort?: number;
}
