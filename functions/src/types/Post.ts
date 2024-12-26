export interface Post {
  id: string;
  boardId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt?: Date;
  comments: number;
  countOfComments: number;
  countOfReplies: number;
  updatedAt?: Date;
  weekDaysFromFirstDay?: number;
}
