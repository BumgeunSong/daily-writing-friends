import type { CommentAuthor } from '@/comment/model/Comment';
import type { FirebaseTimestamp } from '@/shared/model/Timestamp';

export interface Reply {
  id: string;
  content: string;
  userId: string;
  /** Snapshot of the author's name at reply-creation time. */
  userName: string;
  /** Snapshot of the author's profile image at reply-creation time. */
  userProfileImage: string;
  /** Live author profile joined from the users table; absent when the user row is unavailable. */
  author?: CommentAuthor;
  createdAt: FirebaseTimestamp;
}
