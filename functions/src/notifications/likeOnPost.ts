import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { shouldGenerateNotification } from './shouldGenerateNotification';
import admin from '../shared/admin';
import { Notification, NotificationType } from '../shared/types/Notification';
import { Like } from '../shared/types/Like';
import { dualWriteServer, getSupabaseAdmin, throwOnError } from '../shared/supabaseAdmin';

export const onLikeCreatedOnPost = onDocumentCreated(
  'boards/{boardId}/posts/{postId}/likes/{likeId}',
  async (event) => {
    try {
      const like = event.data?.data() as Like;
      const { boardId, postId, likeId } = event.params;

      if (!like) {
        console.error('No like data found in event');
        return;
      }

      const likerUserId = like.userId;
      const likerName = like.userName;
      const likerProfile = like.userProfileImage;

      // 게시글 정보 가져오기
      const postSnapshot = await admin.firestore().doc(`boards/${boardId}/posts/${postId}`).get();

      if (!postSnapshot.exists) {
        console.error(`Post not found: boards/${boardId}/posts/${postId}`);
        return;
      }

      const postData = postSnapshot.data();
      if (!postData) {
        console.error(`Post data is empty: boards/${boardId}/posts/${postId}`);
        return;
      }

      const postAuthorId = postData.authorId;
      const postTitle = postData.title;

      // 본인 좋아요면 알림 생성 X
      if (!shouldGenerateNotification(NotificationType.LIKE_ON_POST, postAuthorId, likerUserId)) {
        console.info(
          `Skipping notification for self-like: post ${boardId}/${postId} by user ${likerUserId}`,
        );
        return;
      }

      // 메시지 생성
      const message = `${likerName}님이 회원님의 글 "${postTitle}"에 공감했어요.`;
      const timestamp = Timestamp.now();

      // 알림 객체 생성
      const notification: Notification = {
        type: NotificationType.LIKE_ON_POST,
        fromUserId: likerUserId,
        fromUserProfileImage: likerProfile,
        boardId,
        postId,
        likeId,
        message,
        timestamp: timestamp,
        read: false,
      };

      // 게시글 작성자에게 알림 추가
      const docRef = await admin.firestore().collection(`users/${postAuthorId}/notifications`).add(notification);

      // Dual-write to Supabase
      await dualWriteServer(
        'notification',
        'create',
        docRef.id,
        async () => {
          const supabase = getSupabaseAdmin();
          throwOnError(await supabase.from('notifications').upsert({
            id: docRef.id,
            user_id: postAuthorId,
            type: NotificationType.LIKE_ON_POST,
            from_user_id: likerUserId,
            from_user_profile_image: likerProfile,
            board_id: boardId,
            post_id: postId,
            like_id: likeId,
            message: message,
            created_at: timestamp.toDate().toISOString(),
            is_read: false,
          }, { onConflict: 'id' }));
        }
      );

      console.info(`Created like notification for user ${postAuthorId} on post ${boardId}/${postId}`);
    } catch (error) {
      console.error('Error creating like notification:', error);
    }
  },
);
