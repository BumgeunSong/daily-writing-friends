import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { generateMessage } from './messageGenerator';
import { shouldGenerateNotification } from './shouldGenerateNotification';
import admin from '../shared/admin';
import { Comment } from '../shared/types/Comment';
import { Notification, NotificationType } from '../shared/types/Notification';
import { Reply } from '../shared/types/Reply';
import { dualWriteServer, getSupabaseAdmin } from '../shared/supabaseAdmin';

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
      const timestamp = Timestamp.now();
      const notification: Notification = {
        type: NotificationType.REPLY_ON_COMMENT,
        fromUserId: replyAuthorId,
        fromUserProfileImage: replyAuthorProfile,
        boardId: boardId,
        postId: postId,
        commentId: commentId,
        replyId: replyId,
        message: message,
        timestamp: timestamp,
        read: false,
      };

      const docRef = await admin
        .firestore()
        .collection(`users/${commentAuthorId}/notifications`)
        .add(notification);

      // Dual-write to Supabase
      await dualWriteServer(
        'notification',
        'create',
        docRef.id,
        async () => {
          const supabase = getSupabaseAdmin();
          await supabase.from('notifications').insert({
            id: docRef.id,
            user_id: commentAuthorId,
            type: NotificationType.REPLY_ON_COMMENT,
            from_user_id: replyAuthorId,
            from_user_profile_image: replyAuthorProfile,
            board_id: boardId,
            post_id: postId,
            comment_id: commentId,
            reply_id: replyId,
            message: message,
            created_at: timestamp.toDate().toISOString(),
            is_read: false,
          });
        }
      );
    }
  },
);
