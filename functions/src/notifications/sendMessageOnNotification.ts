import { onDocumentCreated } from "firebase-functions/firestore";
import admin from "../admin";
import { Notification, NotificationType } from "../types/Notification";
import { User } from "../types/User";
import { FirebaseMessagingToken } from "../types/FirebaseMessagingToken";
import { Post } from "../types/Post";
import { Comment } from "../types/Comment";
import { Reply } from "../types/Reply";

// Send cloud message via FCM tokens to user when notification is created
// firebase messaging token is subcollection of users
export const onNotificationCreated = onDocumentCreated(
    "users/{userId}/notifications/{notificationId}",
    async (event) => {
        const userId = event.params.userId;
        const notification = event.data?.data() as Notification;

        try {
            const userData = await admin.firestore()
                .collection("users")
                .doc(userId)
                .get();
            const user = userData.data() as User;

            // fetch every fcm token of the user
            const fcmTokenData = await admin.firestore()
                .collection("users")
                .doc(userId)
                .collection("firebaseMessagingTokens")
                .get();
            const fcmTokens = fcmTokenData.docs.map((doc) => doc.data() as FirebaseMessagingToken);

            const postData = await admin.firestore()
                .collection("boards")
                .doc(notification.boardId)
                .collection("posts")
                .doc(notification.postId)
                .get();
            const post = postData.data() as Post;

            const commentData = await admin.firestore()
                .collection("boards")
                .doc(notification.boardId)
                .collection("posts")
                .doc(notification.postId)
                .collection("comments")
                .doc(notification.commentId || '')
                .get();
            const comment = commentData.data() as Comment;

            const replyData = await admin.firestore()
                .collection("boards")
                .doc(notification.boardId)
                .collection("posts")
                .doc(notification.postId)
                .collection("comments")
                .doc(notification.commentId || '')
                .collection("replies")
                .doc(notification.replyId || '')
                .get();
            const reply = replyData.data() as Reply;

            const notificationTitle = getNotificationTitle({
                userNickName: user.nickname ?? user.realName ?? '',
                postTitle: post.title,
                notificationType: notification.type,
            });

            const notificationMessage = getNotificationMessage({
                commentContent: comment.content,
                replyContent: reply.content,
                notificationType: notification.type,
            });

            for (const fcmToken of fcmTokens) {
                try {
                    await admin.messaging().send({
                        token: fcmToken.token,
                        notification: {
                            title: notificationTitle,
                            body: notificationMessage,
                            imageUrl: user.profilePhotoURL ?? undefined,
                        },
                    });
                } catch (error) {
                    console.error(`Error sending message to token ${fcmToken.token}:`, notification.message, error);
                }
            }
        } catch (error) {
            console.error("Error processing notification:", notification.message, error);
        }
    }
);

interface NotificationTitleProps {
    userNickName: string;
    postTitle: string;
    notificationType: NotificationType;
}

function getNotificationTitle({ userNickName, postTitle, notificationType }: NotificationTitleProps): string {
    switch (notificationType) {
        case NotificationType.COMMENT_ON_POST:
            return `${userNickName}님이 <strong>'${postTitleSnippet(postTitle)}'</strong> 글에 댓글을 달았어요.`;
        case NotificationType.REPLY_ON_COMMENT:
            return `${userNickName}님이 <strong>'${postTitleSnippet(postTitle)}'</strong> 댓글에 답글을 달았어요.`;
        case NotificationType.REPLY_ON_POST:
            return `${userNickName}님이 <strong>'${postTitleSnippet(postTitle)}'</strong> 글에 답글을 달았어요.`;
    }
}

const postTitleSnippet = (contentTitle: string) => {
    if (contentTitle.length > 24) {
        return contentTitle.slice(0, 24) + "...";
    }
    return contentTitle;
};

interface NotificationMessageProps {
    commentContent: string | null;
    replyContent: string | null;
    notificationType: NotificationType;
}

function getNotificationMessage({ commentContent, replyContent, notificationType }: NotificationMessageProps): string {
    switch (notificationType) {
        case NotificationType.COMMENT_ON_POST:
            return contentSnippet(commentContent ?? '');
        case NotificationType.REPLY_ON_COMMENT:
            return contentSnippet(replyContent ?? '');
        case NotificationType.REPLY_ON_POST:
            return contentSnippet(replyContent ?? '');
    }
}

const contentSnippet = (content: string) => {
    if (content.length > 24) {
        return content.slice(0, 24) + "...";
    }
    return content;
};