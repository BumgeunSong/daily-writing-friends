import type { FirebaseTimestamp } from '@/shared/model/Timestamp';
import type { ProseMirrorDoc } from '@/shared/model/ProseMirror';

// ProseMirror types moved to a feature-neutral home; re-exported here so
// existing `@/post/model/Post` importers keep working.
export type { ProseMirrorDoc, ProseMirrorNode, ProseMirrorMark } from '@/shared/model/ProseMirror';

export interface Post {
  id: string;
  boardId: string;
  title: string;
  content: string;
  contentPreview?: string | null;
  contentJson?: ProseMirrorDoc; // ProseMirror JSON document for TipTap editor
  thumbnailImageURL: string | null;
  authorId: string;
  authorName: string;
  createdAt: FirebaseTimestamp;
  countOfComments: number;
  countOfReplies: number;
  countOfLikes: number;
  engagementScore?: number;
  updatedAt?: FirebaseTimestamp;
  weekDaysFromFirstDay?: number;
  visibility: PostVisibility;
  authorProfileImageURL?: string;
}

export enum PostVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}
