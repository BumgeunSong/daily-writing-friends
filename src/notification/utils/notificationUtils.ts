import type { Notification } from "@/notification/model/Notification";

/**
 * React Query의 notifications 쿼리 키를 생성하는 순수 함수
 */
export const createNotificationQueryKey = (userId: string | null) => 
  ['notifications', userId] as const;

/**
 * 알림 페이지 데이터를 하나의 배열로 평탄화하는 순수 함수
 */
export const flattenNotificationPages = (pages: Notification[][] | undefined): Notification[] => 
  pages?.flatMap(page => page) || [];

/**
 * 다음 페이지를 가져올지 결정하는 순수 함수
 */
export const shouldFetchNextPage = (
  inView: boolean, 
  hasNextPage: boolean | undefined
): boolean => Boolean(inView && hasNextPage);

/**
 * 마지막 알림의 타임스탬프를 가져오는 순수 함수
 */
export const getLastNotificationTimestamp = (notifications: Notification[]) => {
  const lastNotification = notifications[notifications.length - 1];
  return lastNotification ? lastNotification.timestamp : undefined;
}; 