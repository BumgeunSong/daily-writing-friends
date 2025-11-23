import {Timestamp} from 'firebase-admin/firestore';

export interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userProfileImage: string;
  createdAt: Timestamp;
}