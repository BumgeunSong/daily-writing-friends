import { Timestamp } from 'firebase-admin/firestore';

// Reply.ts
export interface Reply {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userProfileImage: string;
  createdAt: Timestamp;
}
