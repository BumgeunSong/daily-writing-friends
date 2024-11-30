import { onDocumentCreated } from "firebase-functions/firestore";
import { Reply } from "../types/Reply";
import { Notification, NotificationType } from "../types/Notification";
import { Timestamp } from "firebase-admin/firestore";
import { Post } from "../types/Post";
import admin from "../admin";

export const onReplyCreatedOnPost = onDocumentCreated(
  "boards/{boardId}/posts/{postId}/replies/{replyId}",
  async (event) => {
    const reply = event.data?.data() as Reply;

    const postId = event.params.postId;
    const boardId = event.params.boardId;
    const replyAuthorId = reply.userId;

    // 게시물 소유자 ID 가져오기
    const postSnapshot = await admin
        .firestore()
        .doc(`boards/${boardId}/posts/${postId}`)
        .get();
    const postData = postSnapshot.data() as Post;
    const postAuthorId = postData.authorId;

    const message = `${reply.userName}님이 '${postData.title.slice(0, 10)}...' 글에 답글을 달았어요.`;

    // 게시물 소유자에게 알림 생성
    if (postAuthorId && postAuthorId !== replyAuthorId) {
      const notification: Notification = {
        type: NotificationType.REPLY_ON_POST,
        fromUserId: replyAuthorId,
        boardId: boardId,
        postId: postId,
        replyId: reply.id,
        message: message,
        timestamp: Timestamp.now(),
        read: false,
    };      

    // 글 작성자에게 알림 생성
    await admin
        .firestore()
        .collection(`users/${postAuthorId}/notifications`)
        .add(notification);
    }
  }
);
