import { Timestamp } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { generateMessage } from "./messageGenerator";
import { shouldGenerateNotification } from "./shouldGenerateNotification";
import admin from "../shared/admin";
import { Comment } from "../shared/types/Comment";
import { Notification, NotificationType } from "../shared/types/Notification";
import { Post } from "../shared/types/Post";

export const onCommentCreated = onDocumentCreated(
    "boards/{boardId}/posts/{postId}/comments/{commentId}",
    async (event) => {
        const comment = event.data?.data() as Comment;

        // 댓글 작성자와 게시물 소유자 ID 가져오기
        const postId = event.params.postId;
        const boardId = event.params.boardId;
        const commentAuthorId = comment.userId;
        const commentAuthorProfile = comment.userProfileImage;

        // 게시물 소유자 ID 가져오기
        const postSnapshot = await admin
            .firestore()
            .doc(`boards/${boardId}/posts/${postId}`)
            .get();
        const postData = postSnapshot.data() as Post;
        const postAuthorId = postData.authorId;
        const postTitle = postData.title;

        const message = generateMessage(NotificationType.COMMENT_ON_POST, comment.userName, postTitle);

        if (shouldGenerateNotification(NotificationType.COMMENT_ON_POST, postAuthorId, commentAuthorId)) {
            // 게시물 소유자에게 알림 생성
            const notification: Notification = {
                type: NotificationType.COMMENT_ON_POST,
                fromUserId: commentAuthorId,
                fromUserProfileImage: commentAuthorProfile,
                boardId: boardId,
                postId: postId,
                commentId: event.params.commentId,
                message: message,
                timestamp: Timestamp.now(),
                read: false,
            };
            // 사용자 하위 컬렉션에 알림 추가
            await admin
                .firestore()
                .collection(`users/${postAuthorId}/notifications`)
                .add(notification);
        }
    }
);