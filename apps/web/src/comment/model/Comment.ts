import type { FirebaseTimestamp } from '@/shared/model/Timestamp';

// src/types/Comment.ts
export interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userProfileImage: string;
  createdAt: FirebaseTimestamp;
}
