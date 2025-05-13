import { Message } from "firebase-admin/lib/messaging/messaging-api";
import { onDocumentCreated } from "firebase-functions/firestore";
import admin from "../admin";
import { FirebaseMessagingToken } from "../types/FirebaseMessagingToken";
import { Notification, NotificationType } from "../types/Notification";
import { Post } from "../types/Post";
import { User } from "../types/User";

// Send cloud message via FCM tokens to user when notification is created
// firebase messaging token is subcollection of users
export const onNotificationCreated = onDocumentCreated(
    "users/{userId}/notifications/{notificationId}",
    async (event) => {
        const userId = event.params.userId;
        const notification = event.data?.data() as Notification;

        console.log("[FCM] Starting notification process", {
            userId,
            notificationId: event.params.notificationId,
            notificationType: notification.type
        });

        try {
            const fromUserData = await admin.firestore()
                .collection("users")
                .doc(notification.fromUserId)
                .get();
            const fromUser = fromUserData.data() as User;

            console.log("[FCM] Fetched fromUser data", {
                fromUserId: notification.fromUserId,
                fromUserNickname: fromUser.nickname
            });

            const fcmTokenData = await admin.firestore()
                .collection("users")
                .doc(userId)
                .collection("firebaseMessagingTokens")
                .get();
            const fcmTokens = fcmTokenData.docs.map((doc) => doc.data() as FirebaseMessagingToken);

            console.log("[FCM] Fetched FCM tokens", {
                tokenCount: fcmTokens.length,
                tokens: fcmTokens.map(t => t.token.slice(-6)) // 보안을 위해 토큰의 마지막 6자리만 로깅
            });

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
                fromUserNickName: fromUser.nickname ?? fromUser.realName ?? '',
                notificationType: notification.type,
            })

            const notificationLink = `/board/${notification.boardId}/post/${notification.postId}`;

            const uniqueTokens = [...new Set(fcmTokens.map(token => token.token))];
            
            for (const token of uniqueTokens) {
                try {
                    console.log("[FCM] Preparing to send message", {
                        tokenEnd: token.slice(-6),
                        title: notificationTitle,
                        body: notificationMessage
                    });

                    const message: Message = {
                        token,
                        data: {
                            boardId: notification.boardId,
                            postId: notification.postId,
                            link: notificationLink,
                            icon: notification.fromUserProfileImage ?? '',
                            title: notificationTitle,
                            body: notificationMessage,
                        },
                        android: {
                            priority: "high",
                        },
                        apns: {
                            headers: {
                                "apns-priority": "10"
                            },
                            payload: {
                                aps: {
                                    badge: 1,
                                    sound: "default"
                                }
                            }
                        }
                    };

                    console.log("[FCM] Message structure", JSON.stringify(message, null, 2));

                    const response = await admin.messaging().send(message);
                    console.log("[FCM] Message sent successfully", {
                        tokenEnd: token.slice(-6),
                        messageId: response
                    });

                } catch (error: any) {
                    console.error("[FCM] Error sending message", {
                        tokenEnd: token.slice(-6),
                        errorCode: error.code,
                        errorMessage: error.message,
                        fullError: JSON.stringify(error, null, 2)
                    });

                    if (error.code === 'messaging/registration-token-not-registered') {
                        console.log("[FCM] Removing invalid token", {
                            tokenEnd: token.slice(-6)
                        });
                        await removeInvalidToken(userId, token);
                    }
                }
            }
        } catch (error) {
            console.error("[FCM] Critical error in notification process", error);
        }
    }
);

async function removeInvalidToken(userId: string, token: string) {
    try {
        const tokenRef = admin.firestore()
            .collection("users")
            .doc(userId)
            .collection("firebaseMessagingTokens")
            .where("token", "==", token);

        const snapshot = await tokenRef.get();
        if (!snapshot.empty) {
            snapshot.forEach(async (doc) => {
                await doc.ref.delete();
                console.log(`Removed invalid token: ${token}`);
            });
        }
    } catch (error) {
        console.error(`Error removing invalid token ${token}:`, error);
    }
}

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
    fromUserNickName: string;
    notificationType: NotificationType;
}

function getNotificationMessage({ postTitle, fromUserNickName, notificationType }: NotificationMessageProps): string {
    switch (notificationType) {
        case NotificationType.COMMENT_ON_POST:
            return `${fromUserNickName}님이 '${postTitleSnippet(postTitle)}' 글에 댓글을 달았어요.`;
        case NotificationType.REPLY_ON_COMMENT:
            return `${fromUserNickName}님이 '${postTitleSnippet(postTitle)}' 댓글에 답글을 달았어요.`;
        case NotificationType.REPLY_ON_POST:
            return `${fromUserNickName}님이 '${postTitleSnippet(postTitle)}' 글에 답글을 달았어요.`;
    }
}