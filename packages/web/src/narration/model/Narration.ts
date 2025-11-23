import { Timestamp } from 'firebase/firestore';

export interface Narration {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NarrationSection {
  id: string;
  title: string;
  script: string;
  pauseMinutes: number;
  storagePath: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
