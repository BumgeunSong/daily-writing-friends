import { Timestamp } from "firebase/firestore";

export interface Post {
  id: string;
  boardId: string;
  title: string;
  content: string;
  thumbnailImageURL: string | null;
  authorId: string;
  authorName: string;
  createdAt?: Timestamp;
  countOfComments: number;
  countOfReplies: number;
  updatedAt?: Timestamp;
  weekDaysFromFirstDay?: number;
  visibility?: PostVisibility;
}

export enum PostVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private'
}