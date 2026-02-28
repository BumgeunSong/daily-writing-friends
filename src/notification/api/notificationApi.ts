import { fetchNotificationsFromSupabase } from '@/shared/api/supabaseReads';
import type { NotificationDTO } from '@/shared/api/supabaseReads';
import type { Notification } from '@/notification/model/Notification';
import { NotificationType } from '@/notification/model/Notification';
import { Timestamp } from 'firebase/firestore';

function mapDTOToNotification(row: NotificationDTO): Notification {
  const base = {
    id: row.id,
    boardId: row.boardId,
    postId: row.postId,
    fromUserId: row.fromUserId,
    fromUserProfileImage: row.fromUserProfileImage,
    message: row.message,
    timestamp: Timestamp.fromDate(new Date(row.timestamp)),
    read: row.read,
  };

  switch (row.type) {
    case NotificationType.COMMENT_ON_POST:
      if (!row.commentId) throw new Error(`Notification ${row.id}: COMMENT_ON_POST missing commentId`);
      return { ...base, type: row.type, commentId: row.commentId };
    case NotificationType.REPLY_ON_COMMENT:
      if (!row.commentId || !row.replyId) throw new Error(`Notification ${row.id}: REPLY_ON_COMMENT missing commentId or replyId`);
      return { ...base, type: row.type, commentId: row.commentId, replyId: row.replyId };
    case NotificationType.REPLY_ON_POST:
      if (!row.replyId) throw new Error(`Notification ${row.id}: REPLY_ON_POST missing replyId`);
      return { ...base, type: row.type, replyId: row.replyId };
    case NotificationType.REACTION_ON_COMMENT:
      if (!row.commentId) throw new Error(`Notification ${row.id}: REACTION_ON_COMMENT missing commentId`);
      return { ...base, type: row.type, commentId: row.commentId };
    case NotificationType.REACTION_ON_REPLY:
      if (!row.commentId || !row.replyId) throw new Error(`Notification ${row.id}: REACTION_ON_REPLY missing commentId or replyId`);
      return { ...base, type: row.type, commentId: row.commentId, replyId: row.replyId };
    case NotificationType.LIKE_ON_POST:
      return { ...base, type: row.type };
  }
}

/**
 * 알림 데이터를 가져오는 API 함수
 *
 * @param userId - 사용자 ID
 * @param limitCount - 한 번에 가져올 알림 수
 * @param after - 페이지네이션을 위한 타임스탬프 커서
 * @returns 알림 목록
 */
export const fetchNotifications = async (
  userId: string,
  limitCount: number,
  after?: Timestamp
): Promise<Notification[]> => {
  const afterStr = after ? after.toDate().toISOString() : undefined;
  const rows = await fetchNotificationsFromSupabase(userId, limitCount, afterStr);
  return rows.map(mapDTOToNotification);
};
