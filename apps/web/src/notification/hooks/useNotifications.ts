import * as Sentry from '@sentry/react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchNotifications } from '@/notification/api/notificationApi';
import { createNotificationQueryKey, getLastNotificationTimestamp } from '@/notification/utils/notificationUtils';

// DATA - Query configuration
const NOTIFICATIONS_CONFIG = {
  STALE_TIME: 1000 * 30, // 30초
  CACHE_TIME: 1000 * 60 * 5, // 5분
  REFETCH_INTERVAL: 1000 * 60, // 1분
} as const;

/**
 * 사용자의 알림 목록을 가져오는 훅
 * @param userId 사용자 ID
 * @param limitCount 한 번에 가져올 알림 수
 * @returns React Query의 useInfiniteQuery 결과 객체
 */
export const useNotifications = (userId: string | null, limitCount: number) => {
  return useInfiniteQuery(
    // DATA - Query key using pure function
    createNotificationQueryKey(userId),
    // ACTION - Fetch function with explicit null guard
    ({ pageParam }) => {
      if (!userId) {
        throw new Error('User ID is required to fetch notifications');
      }
      return fetchNotifications(userId, limitCount, pageParam);
    },
    {
      enabled: userId != null,
      // CALCULATION - Get next page parameter using pure function
      getNextPageParam: (lastPage) => getLastNotificationTimestamp(lastPage),
      // ACTION - Error handling
      onError: (error) => {
        console.error('알림 데이터를 불러오던 중 에러가 발생했습니다:', error);
        Sentry.captureException(error);
      },
      ...NOTIFICATIONS_CONFIG,
      refetchOnWindowFocus: true,
    }
  );
};
