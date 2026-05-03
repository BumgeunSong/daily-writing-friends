import type { Notification } from '@/notification/model/Notification';

/**
 * Flatten the per-page notification arrays returned by useInfiniteQuery into
 * one ordered list. Hook-internal: the public hook surface returns the flat
 * array; callers should not need this helper directly.
 */
export const flattenNotificationPages = (
  pages: Notification[][] | undefined,
): Notification[] => pages?.flatMap((page) => page) ?? [];

/**
 * Cursor extractor for useInfiniteQuery's getNextPageParam. Returns the
 * timestamp of the last notification in a page, or undefined to signal "no
 * more pages."
 */
export const getLastNotificationTimestamp = (notifications: Notification[]) => {
  const lastNotification = notifications[notifications.length - 1];
  return lastNotification ? lastNotification.timestamp : undefined;
};
