import { onDocumentCreated } from "firebase-functions/firestore";
import admin from "../admin";
import { Notification, NotificationType } from "../types/Notification";
import { User } from "../types/User";
import { FirebaseMessagingToken } from "../types/FirebaseMessagingToken";
import { Post } from "../types/Post";

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

            const notificationTitle = getNotificationTitle({
                notificationType: notification.type,
            });

            const notificationMessage = getNotificationMessage({
                postTitle: post.title,
                userNickName: user.nickname ?? user.realName ?? '',
                notificationType: notification.type,
            });

            const tokens = fcmTokens.map(token => token.token);

            if (tokens.length > 0) {
                try {
                    const response = await admin.messaging().sendMulticast({
                        tokens,
                        notification: {
                            title: notificationTitle,
                            body: notificationMessage,
                            imageUrl: notification.fromUserProfileImage,
                        },
                    });

                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            console.error(`Error sending message to token ${tokens[idx]}:`, resp.error);
                        }
                    });
                } catch (error) {
                    console.error("Error sending multicast message:", error);
                }
            }
        } catch (error) {
            console.error("Error processing notification:", notification.message, error);
        }
    }
);

interface NotificationTitleProps {
    notificationType: NotificationType;
}

function getNotificationTitle({ notificationType }: NotificationTitleProps): string {
    switch (notificationType) {
        case NotificationType.COMMENT_ON_POST:
            return `댓글 알림`;
        case NotificationType.REPLY_ON_COMMENT:
            return `답글 알림`;
        case NotificationType.REPLY_ON_POST:
            return `답글 알림`;
    }
}

const postTitleSnippet = (contentTitle: string) => {
    if (contentTitle.length > 24) {
        return contentTitle.slice(0, 24) + "...";
    }
    return contentTitle;
};

interface NotificationMessageProps {
    postTitle: string;
    userNickName: string;
    notificationType: NotificationType;
}

function getNotificationMessage({ postTitle, userNickName, notificationType }: NotificationMessageProps): string {
    switch (notificationType) {
        case NotificationType.COMMENT_ON_POST:
            return `${userNickName}님이 '${postTitleSnippet(postTitle)}' 글에 댓글을 달았어요.`;
        case NotificationType.REPLY_ON_COMMENT:
            return `${userNickName}님이 '${postTitleSnippet(postTitle)}' 댓글에 답글을 달았어요.`;
        case NotificationType.REPLY_ON_POST:
            return `${userNickName}님이 '${postTitleSnippet(postTitle)}' 글에 답글을 달았어요.`;
    }
}