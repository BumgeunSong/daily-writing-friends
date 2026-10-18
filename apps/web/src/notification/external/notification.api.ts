import { fetchNotificationsFromSupabase, type NotificationPage } from './notification.reads';
import type { NotificationCursor } from './notificationCursor';

export type { NotificationCursor, NotificationPage };

/**
 * 알림 피드 한 페이지를 가져온다. 커서는 (created_at, id) 튜플이라 같은
 * created_at을 가진 알림이 페이지 경계에서 누락되지 않는다. 실제 파싱과 도메인
 * 변환은 fetchNotificationsFromSupabase 안에서 일어난다.
 *
 * @param userId - 사용자 ID
 * @param limitCount - 한 번에 가져올 알림 수
 * @param cursor - 이전 페이지 마지막 행의 키셋 커서 (첫 페이지는 생략)
 */
export const fetchNotifications = async (
  userId: string,
  limitCount: number,
  cursor?: NotificationCursor,
): Promise<NotificationPage> => {
  return fetchNotificationsFromSupabase(userId, limitCount, cursor);
};
