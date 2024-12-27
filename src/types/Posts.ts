
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
}
