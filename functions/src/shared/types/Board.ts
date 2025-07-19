import { Timestamp } from 'firebase/firestore';

export interface Board {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  firstDay?: Timestamp;
}
