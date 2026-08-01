import { fetchNotificationsFromSupabase } from './notificationReads';
import type { Notification } from '@/notification/model/Notification';
import type { FirebaseTimestamp } from '@/shared/model/Timestamp';

/**
 * 알림 데이터를 가져오는 API 함수
 *
 * 커서 타임스탬프를 ISO 문자열로 변환하여 Supabase 쿼리에 전달.
 * 실제 파싱과 도메인 변환은 fetchNotificationsFromSupabase 안에서 일어남.
 *
 * @param userId - 사용자 ID
 * @param limitCount - 한 번에 가져올 알림 수
 * @param after - 페이지네이션을 위한 타임스탬프 커서
 * @returns 알림 목록
 */
export const fetchNotifications = async (
  userId: string,
  limitCount: number,
  after?: FirebaseTimestamp,
): Promise<Notification[]> => {
  const afterStr = after ? after.toDate().toISOString() : undefined;
  return fetchNotificationsFromSupabase(userId, limitCount, afterStr);
};
