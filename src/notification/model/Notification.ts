import { Timestamp } from 'firebase/firestore';

export interface Notification {
    id: string;
    type: NotificationType;
    boardId: string;
    postId: string;
    commentId?: string;
    replyId?: string;
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
}