import { Timestamp } from 'firebase-admin/firestore';

export interface Like {
  userId: string;
  userName: string;
  userProfileImage: string;
  createdAt: Timestamp;
}
