// src/types/Post.ts
import { Timestamp } from 'firebase/firestore';

export interface Post {
  id: string;
  boardId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt?: Date;
  comments: number;
  updatedAt?: Date;
  daysFromFirstDay?: number;
}
