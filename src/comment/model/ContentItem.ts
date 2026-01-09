import { Timestamp } from 'firebase/firestore';

/**
 * Base interface for content items (comments and replies)
 * Both Comment and Reply share these exact fields
 */
export interface ContentItem {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userProfileImage: string;
  createdAt: Timestamp;
}

export type ContentType = 'comment' | 'reply';
