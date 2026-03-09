import type { FirebaseTimestamp } from '@/shared/model/Timestamp';

// Reply.ts
export interface Reply {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userProfileImage: string;
  createdAt: FirebaseTimestamp;
}
