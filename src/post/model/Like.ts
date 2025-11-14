import { Timestamp } from 'firebase/firestore';

export interface Like {
  id: string;
  userId: string;
  userName: string;
  userProfileImage: string;
  createdAt: Timestamp;
}
