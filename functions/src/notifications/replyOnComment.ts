import admin from "../admin";
import { Timestamp } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { Reply } from "../types/Reply";
import { Comment } from "../types/Comment";
import { Notification, NotificationType } from "../types/Notification";

export const onReplyCreatedOnComment = onDocumentCreated(
  "boards/{boardId}/posts/{postId}/comments/{commentId}/replies/{replyId}",
  async (event) => {
    const reply = event.data?.data() as Reply;

    // 댓글 및 게시물 정보 가져오기
    const postId = event.params.postId;
    const boardId = event.params.boardId;
    const commentId = event.params.commentId;
    const replyAuthorId = reply.userId;

    // 댓글 작성자 ID 가져오기
    const commentSnapshot = await admin
      .firestore()
      .doc(`boards/${boardId}/posts/${postId}/comments/${commentId}`)
      .get();
    const commentData = commentSnapshot.data() as Comment;
    const commentAuthorId = commentData.userId;

    const message = `${reply.userName}님이 당신의 '${commentData.content.slice(0, 10)}...' 댓글에 답글을 달았어요.`;

    console.log("commentAuthorId", commentAuthorId);
    console.log("replyAuthorId", replyAuthorId);

    // 댓글 작성자에게 알림 생성
    if (commentAuthorId && commentAuthorId !== replyAuthorId) {
      const notification: Notification = {
        type: NotificationType.REPLY_ON_COMMENT,
        fromUserId: replyAuthorId,
        boardId: boardId,
        postId: postId,
        commentId: commentId,
        replyId: reply.id,
        message: message,
        timestamp: Timestamp.now(),
        read: false,
      };

      // 글 작성자에게 알림 생성
      console.log("Notification created", notification);
      // 사용자 하위 컬렉션에 알림 추가
      await admin
        .firestore()
        .collection(`users/${commentAuthorId}/notifications`)
        .add(notification);
    }
  }
);
