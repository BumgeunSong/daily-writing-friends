import { Timestamp } from 'firebase-admin/firestore';

export interface Post {
  id: string;
  boardId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt?: Timestamp;
  comments: number;
  countOfComments: number;
  countOfReplies: number;
  updatedAt?: Timestamp;
  weekDaysFromFirstDay?: number;
}
