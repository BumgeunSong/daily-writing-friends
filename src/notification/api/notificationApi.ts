import { fetchNotificationsFromSupabase } from '@/shared/api/supabaseReads';
import { Notification } from '@/notification/model/Notification';
import { Timestamp } from 'firebase/firestore';

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

  return rows.map(row => ({
    id: row.id,
    type: row.type as Notification['type'],
    boardId: row.boardId,
    postId: row.postId,
    commentId: row.commentId,
    replyId: row.replyId,
    fromUserId: row.fromUserId,
    fromUserProfileImage: row.fromUserProfileImage,
    message: row.message,
    timestamp: Timestamp.fromDate(new Date(row.timestamp)),
    read: row.read,
  }));
};
