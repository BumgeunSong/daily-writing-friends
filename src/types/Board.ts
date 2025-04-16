import { Timestamp } from "firebase/firestore";

// src/types/Board.ts
export interface Board {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  firstDay?: Timestamp;
  lastDay?: Timestamp;
  cohort?: number;
  waitingUsersIds: string[];
}

export interface Review {
  reviewer: {
    uid: string;
    nickName: string;
    realName: string;
  };
  keep?: string;
  problem?: string;
  try?: string;
  nps: number;
  willContinue: "yes" | "no";
  createdAt: Date;
  updatedAt: Date;
}
