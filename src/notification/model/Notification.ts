import type { Timestamp } from 'firebase/firestore';

export enum NotificationType {
  COMMENT_ON_POST = 'comment_on_post',
  REPLY_ON_COMMENT = 'reply_on_comment',
  REPLY_ON_POST = 'reply_on_post',
  REACTION_ON_COMMENT = 'reaction_on_comment',
  REACTION_ON_REPLY = 'reaction_on_reply',
  LIKE_ON_POST = 'like_on_post',
}

interface NotificationBase {
  id: string;
  boardId: string;
  postId: string;
  fromUserId: string;
  fromUserProfileImage?: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
}

export interface CommentNotification extends NotificationBase {
  type: NotificationType.COMMENT_ON_POST;
  commentId: string;
}

export interface ReplyOnCommentNotification extends NotificationBase {
  type: NotificationType.REPLY_ON_COMMENT;
  commentId: string;
  replyId: string;
}

export interface ReplyOnPostNotification extends NotificationBase {
  type: NotificationType.REPLY_ON_POST;
  replyId: string;
}

export interface ReactionOnCommentNotification extends NotificationBase {
  type: NotificationType.REACTION_ON_COMMENT;
  commentId: string;
}

export interface ReactionOnReplyNotification extends NotificationBase {
  type: NotificationType.REACTION_ON_REPLY;
  commentId: string;
  replyId: string;
}

export interface LikeNotification extends NotificationBase {
  type: NotificationType.LIKE_ON_POST;
}

export type Notification =
  | CommentNotification
  | ReplyOnCommentNotification
  | ReplyOnPostNotification
  | ReactionOnCommentNotification
  | ReactionOnReplyNotification
  | LikeNotification;
