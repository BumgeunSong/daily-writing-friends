import { Timestamp } from 'firebase/firestore';

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
  content: string;
  contentJson?: ProseMirrorDoc; // ProseMirror JSON document for TipTap editor
  thumbnailImageURL: string | null;
  authorId: string;
  authorName: string;
  createdAt?: Timestamp;
  countOfComments: number;
  countOfReplies: number;
  countOfLikes: number;
  engagementScore?: number;
  updatedAt?: Timestamp;
  weekDaysFromFirstDay?: number;
  visibility?: PostVisibility;
}

export enum PostVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}
