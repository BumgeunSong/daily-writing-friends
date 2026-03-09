import type { FirebaseTimestamp } from '@/shared/model/Timestamp';

export interface Like {
  id: string;
  userId: string;
  userName: string;
  userProfileImage: string;
  createdAt: FirebaseTimestamp;
}
