import type { FirebaseTimestamp } from '@/shared/model/Timestamp';

export interface CommentAuthor {
  nickname: string | null;
  profilePhotoURL: string | null;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  /** Snapshot of the author's name at comment-creation time. */
  userName: string;
  /** Snapshot of the author's profile image at comment-creation time. */
  userProfileImage: string;
  /** Live author profile joined from the users table; absent when the user row is unavailable. */
  author?: CommentAuthor;
  createdAt: FirebaseTimestamp;
}
