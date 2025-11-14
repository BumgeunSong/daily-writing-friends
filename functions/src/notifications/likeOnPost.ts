import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { shouldGenerateNotification } from './shouldGenerateNotification';
import admin from '../shared/admin';
import { Notification, NotificationType } from '../shared/types/Notification';
import { Like } from '../shared/types/Like';

export const onLikeCreatedOnPost = onDocumentCreated(
  'boards/{boardId}/posts/{postId}/likes/{likeId}',
  async (event) => {
    const like = event.data?.data() as Like;
    const { boardId, postId, likeId } = event.params;
    const likerUserId = like.userId;
    const likerName = like.userName;
    const likerProfile = like.userProfileImage;

    // 게시글 정보 가져오기
    const postSnapshot = await admin.firestore().doc(`boards/${boardId}/posts/${postId}`).get();

    const postData = postSnapshot.data();
    if (!postData) return;

    const postAuthorId = postData.authorId;
    const postTitle = postData.title;

    // 본인 좋아요면 알림 생성 X
    if (!shouldGenerateNotification(NotificationType.LIKE_ON_POST, postAuthorId, likerUserId))
      return;

    // 메시지 생성
    const message = `${likerName}님이 회원님의 글 "${postTitle}"에 공감했어요.`;

    // 알림 객체 생성
    const notification: Notification = {
      type: NotificationType.LIKE_ON_POST,
      fromUserId: likerUserId,
      fromUserProfileImage: likerProfile,
      boardId,
      postId,
      likeId,
      message,
      timestamp: Timestamp.now(),
      read: false,
    };

    // 게시글 작성자에게 알림 추가
    await admin.firestore().collection(`users/${postAuthorId}/notifications`).add(notification);
  },
);
