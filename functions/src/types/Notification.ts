import {Timestamp} from 'firebase-admin/firestore';

export interface Notification {
  type: NotificationType;
  boardId: string;
  postId: string;
  commentId?: string;
  fromUserId: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
}

export enum NotificationType {
  COMMENT_ON_POST = 'comment_on_post',
  REPLY_ON_COMMENT = 'reply_on_comment',
  REPLY_ON_POST = 'reply_on_post',
}