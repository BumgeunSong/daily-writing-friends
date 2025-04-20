export interface Post {
  id: string;
  boardId: string;
  title: string;
  content: string;
  thumbnailImageURL: string | null;
  authorId: string;
  authorName: string;
  createdAt?: Date;
  countOfComments: number;
  countOfReplies: number;
  updatedAt?: Date;
  weekDaysFromFirstDay?: number;
  visibility?: PostVisibility;
}

export enum PostVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private'
}