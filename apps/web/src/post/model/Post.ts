import type { FirebaseTimestamp } from '@/shared/model/Timestamp';

/**
 * ProseMirror document structure for TipTap editor
 * Based on ProseMirror JSON schema
 */
export interface ProseMirrorDoc {
  type: 'doc';
  content?: ProseMirrorNode[];
}

export interface ProseMirrorNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseMirrorNode[];
  marks?: ProseMirrorMark[];
  text?: string;
}

export interface ProseMirrorMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface Post {
  id: string;
  boardId: string;
  title: string;
  /** Full HTML content. Empty string when the row was loaded via a list query
   *  (FEED_POST_SELECT) that omits this column — never substitute the preview here. */
  content: string;
  /** Preview HTML (≤500 chars). Present on list queries; the detail query (`posts_feed.*`)
   *  also returns it. Card components must read this, not `content`, so list-shape Posts
   *  cannot leak into detail-render paths. */
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
