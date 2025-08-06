import { Timestamp } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/firestore";
import { generateMessage } from "./messageGenerator";
import { shouldGenerateNotification } from "./shouldGenerateNotification";
import admin from "../shared/admin";
import { Notification, NotificationType } from "../shared/types/Notification";
import { Post } from "../shared/types/Post";
import { Reply } from "../shared/types/Reply";

export const onReplyCreatedOnPost = onDocumentCreated(
    "boards/{boardId}/posts/{postId}/comments/{commentId}/replies/{replyId}",
    async (event) => {
        const reply = event.data?.data() as Reply;

        const postId = event.params.postId;
        const boardId = event.params.boardId;
        const commentId = event.params.commentId;
        const replyId = event.params.replyId;
        const replyAuthorId = reply.userId;
        const replyAuthorProfile = reply.userProfileImage;
        // 게시물 소유자 ID 가져오기
        const postSnapshot = await admin
            .firestore()
            .doc(`boards/${boardId}/posts/${postId}`)
            .get();
        const postData = postSnapshot.data() as Post;
        const postAuthorId = postData.authorId;

        const message = generateMessage(NotificationType.REPLY_ON_POST, reply.userName, postData.title);

        // 게시물 소유자에게 알림 생성
        if (shouldGenerateNotification(NotificationType.REPLY_ON_POST, postAuthorId, replyAuthorId)) {
            const notification: Notification = {
                type: NotificationType.REPLY_ON_POST,
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

            // 글 작성자에게 알림 생성
            await admin
                .firestore()
                .collection(`users/${postAuthorId}/notifications`)
                .add(notification);
        }
    }
);
