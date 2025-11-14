import { Timestamp } from 'firebase-admin/firestore';

export interface Notification {
  type: NotificationType;
  boardId: string;
  postId: string;
  commentId?: string;
  replyId?: string;
  reactionId?: string;
  likeId?: string;
  fromUserId: string;
  fromUserProfileImage?: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
}

export enum NotificationType {
  COMMENT_ON_POST = 'comment_on_post',
  REPLY_ON_COMMENT = 'reply_on_comment',
  REPLY_ON_POST = 'reply_on_post',
  REACTION_ON_COMMENT = 'reaction_on_comment',
  REACTION_ON_REPLY = 'reaction_on_reply',
  LIKE_ON_POST = 'like_on_post',
}
