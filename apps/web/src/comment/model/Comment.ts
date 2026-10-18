import type { FirebaseTimestamp } from '@/shared/model/Timestamp';
import type { ProseMirrorDoc } from '@/shared/model/ProseMirror';

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
  /**
   * Structured editor content (mentions carry user_id here). Absent on legacy
   * comments written before dual-write; `content` remains the derived cache.
   */
  contentJson?: ProseMirrorDoc;
  createdAt: FirebaseTimestamp;
}
