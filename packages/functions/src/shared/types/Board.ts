import { Timestamp } from 'firebase-admin/firestore';

export interface Board {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  firstDay?: Timestamp;
}
