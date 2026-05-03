import * as Sentry from '@sentry/react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { fetchNotifications } from '@/notification/api/notificationApi';
import type { Notification } from '@/notification/model/Notification';
import { createNotificationQueryKey } from '@/notification/utils/notificationQueryKeys';
import {
  flattenNotificationPages,
  getLastNotificationTimestamp,
  reportNotificationFetchError,
} from '@/notification/utils/notificationUtils';

const NOTIFICATIONS_CONFIG = {
  STALE_TIME: 1000 * 30,
  CACHE_TIME: 1000 * 60 * 5,
  REFETCH_INTERVAL: 1000 * 60,
} as const;

interface UseNotificationsResult {
  notifications: Notification[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
}

/**
 * Hook for the user's Notification Feed.
 *
 * Returns a flat list of notifications, hiding React Query's per-page shape
 * from the caller. Pagination, error capture, and refetch policy live behind
 * the seam.
 */
export const useNotifications = (
  userId: string | null,
  limitCount: number,
): UseNotificationsResult => {
  const query = useInfiniteQuery(
    createNotificationQueryKey(userId),
    ({ pageParam }) => {
      if (!userId) {
        throw new Error('User ID is required to fetch notifications');
      }
      return fetchNotifications(userId, limitCount, pageParam);
    },
    {
      enabled: userId != null,
      getNextPageParam: (lastPage) => getLastNotificationTimestamp(lastPage),
      onError: (error) => {
        reportNotificationFetchError(error, {
          log: (message, err) => console.error(message, err),
          capture: (err) => Sentry.captureException(err),
        });
      },
      ...NOTIFICATIONS_CONFIG,
      refetchOnWindowFocus: true,
    },
  );

  return {
    notifications: flattenNotificationPages(query.data?.pages),
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
};
