import type { Timestamp } from 'firebase/firestore';

// src/types/Comment.ts
export interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userProfileImage: string;
  createdAt: Timestamp;
}
