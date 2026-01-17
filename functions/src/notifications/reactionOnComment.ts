import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { shouldGenerateNotification } from './shouldGenerateNotification';
import admin from '../shared/admin';
import { Notification, NotificationType } from '../shared/types/Notification';
import { Reaction } from '../shared/types/Reaction';
import { dualWriteServer, getSupabaseAdmin } from '../shared/supabaseAdmin';

export const onReactionCreatedOnComment = onDocumentCreated(
  'boards/{boardId}/posts/{postId}/comments/{commentId}/reactions/{reactionId}',
  async (event) => {
    const reaction = event.data?.data() as Reaction;
    const { boardId, postId, commentId, reactionId } = event.params;
    const reactorId = reaction.reactionUser.userId;
    const reactorProfile = reaction.reactionUser.userProfileImage;
    const reactorName = reaction.reactionUser.userName;
    const emojiContent = reaction.content;

    // 댓글 정보 가져오기
    const commentSnapshot = await admin
      .firestore()
      .doc(`boards/${boardId}/posts/${postId}/comments/${commentId}`)
      .get();
    const commentData = commentSnapshot.data();
    if (!commentData) return;
    const commentAuthorId = commentData.userId;

    // 본인 반응이면 알림 생성 X
    if (
      !shouldGenerateNotification(NotificationType.REACTION_ON_COMMENT, commentAuthorId, reactorId)
    )
      return;

    // 메시지 생성
    const message = `${reactorName}님이 댓글에 반응을 남겼어요. ${emojiContent}`;
    const timestamp = Timestamp.now();

    // 알림 객체 생성
    const notification: Notification = {
      type: NotificationType.REACTION_ON_COMMENT,
      fromUserId: reactorId,
      fromUserProfileImage: reactorProfile,
      boardId,
      postId,
      commentId,
      reactionId,
      message,
      timestamp: timestamp,
      read: false,
    };

    // 댓글 작성자에게 알림 추가
    const docRef = await admin.firestore().collection(`users/${commentAuthorId}/notifications`).add(notification);

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
          type: NotificationType.REACTION_ON_COMMENT,
          from_user_id: reactorId,
          from_user_profile_image: reactorProfile,
          board_id: boardId,
          post_id: postId,
          comment_id: commentId,
          reaction_id: reactionId,
          message: message,
          created_at: timestamp.toDate().toISOString(),
          is_read: false,
        });
      }
    );
  },
);

export const onReactionCreatedOnReply = onDocumentCreated(
  'boards/{boardId}/posts/{postId}/comments/{commentId}/replies/{replyId}/reactions/{reactionId}',
  async (event) => {
    const reaction = event.data?.data() as Reaction;
    const { boardId, postId, commentId, replyId, reactionId } = event.params;
    const reactorId = reaction.reactionUser.userId;
    const reactorProfile = reaction.reactionUser.userProfileImage;
    const reactorName = reaction.reactionUser.userName;
    const emojiContent = reaction.content;

    // 답글 정보 가져오기
    const replySnapshot = await admin
      .firestore()
      .doc(`boards/${boardId}/posts/${postId}/comments/${commentId}/replies/${replyId}`)
      .get();
    const replyData = replySnapshot.data();
    if (!replyData) return;
    const replyAuthorId = replyData.userId;

    // 본인 반응이면 알림 생성 X
    if (!shouldGenerateNotification(NotificationType.REACTION_ON_REPLY, replyAuthorId, reactorId))
      return;

    // 메시지 생성
    const message = `${reactorName}님이 답글에 반응을 남겼어요. ${emojiContent}`;
    const timestamp = Timestamp.now();

    // 알림 객체 생성
    const notification: Notification = {
      type: NotificationType.REACTION_ON_REPLY,
      fromUserId: reactorId,
      fromUserProfileImage: reactorProfile,
      boardId,
      postId,
      commentId,
      replyId,
      reactionId,
      message,
      timestamp: timestamp,
      read: false,
    };

    // 답글 작성자에게 알림 추가
    const docRef = await admin.firestore().collection(`users/${replyAuthorId}/notifications`).add(notification);

    // Dual-write to Supabase
    await dualWriteServer(
      'notification',
      'create',
      docRef.id,
      async () => {
        const supabase = getSupabaseAdmin();
        await supabase.from('notifications').insert({
          id: docRef.id,
          user_id: replyAuthorId,
          type: NotificationType.REACTION_ON_REPLY,
          from_user_id: reactorId,
          from_user_profile_image: reactorProfile,
          board_id: boardId,
          post_id: postId,
          comment_id: commentId,
          reply_id: replyId,
          reaction_id: reactionId,
          message: message,
          created_at: timestamp.toDate().toISOString(),
          is_read: false,
        });
      }
    );
  },
);
