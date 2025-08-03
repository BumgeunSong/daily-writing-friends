import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { generateMessage } from './messageGenerator';
import { shouldGenerateNotification } from './shouldGenerateNotification';
import admin from '../shared/admin';
import { Comment } from '../shared/types/Comment';
import { Notification, NotificationType } from '../shared/types/Notification';
import { Reply } from '../shared/types/Reply';

export const onReplyCreatedOnComment = onDocumentCreated(
  'boards/{boardId}/posts/{postId}/comments/{commentId}/replies/{replyId}',
  async (event) => {
    const reply = event.data?.data() as Reply;

    // 댓글 및 게시물 정보 가져오기
    const postId = event.params.postId;
    const boardId = event.params.boardId;
    const commentId = event.params.commentId;
    const replyId = event.params.replyId;
    const replyAuthorId = reply.userId;
    const replyAuthorProfile = reply.userProfileImage;
    // 댓글 작성자 ID 가져오기
    const commentSnapshot = await admin
      .firestore()
      .doc(`boards/${boardId}/posts/${postId}/comments/${commentId}`)
      .get();
    const commentData = commentSnapshot.data() as Comment;
    const commentAuthorId = commentData.userId;

    const message = generateMessage(
      NotificationType.REPLY_ON_COMMENT,
      reply.userName,
      commentData.content,
    );

    // 댓글 작성자에게 알림 생성
    if (
      shouldGenerateNotification(NotificationType.REPLY_ON_COMMENT, commentAuthorId, replyAuthorId)
    ) {
      const notification: Notification = {
        type: NotificationType.REPLY_ON_COMMENT,
        fromUserId: replyAuthorId,
        fromUserProfileImage: replyAuthorProfile,
        boardId: boardId,
        postId: postId,
        commentId: commentId,
        replyId: replyId,
        message: message,
        timestamp: Timestamp.now(),
        read: false,
      };

      await admin
        .firestore()
        .collection(`users/${commentAuthorId}/notifications`)
        .add(notification);
    }
  },
);
