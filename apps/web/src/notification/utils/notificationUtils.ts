import type { Notification } from '@/notification/model/Notification';

const NOTIFICATION_FETCH_ERROR_LOG_PREFIX = '알림 데이터를 불러오던 중 에러가 발생했습니다:';

/**
 * Flatten the per-page notification arrays returned by useInfiniteQuery into
 * one ordered list. Hook-internal: the public hook surface returns the flat
 * array; callers should not need this helper directly.
 */
export const flattenNotificationPages = (
  pages: Notification[][] | undefined,
): Notification[] => pages?.flat() ?? [];

/**
 * Cursor extractor for useInfiniteQuery's getNextPageParam. Returns the
 * timestamp of the last notification in a page, or undefined to signal "no
 * more pages."
 */
export const getLastNotificationTimestamp = (notifications: Notification[]) => {
  const lastNotification = notifications[notifications.length - 1];
  return lastNotification ? lastNotification.timestamp : undefined;
};

/**
 * Reporter dependencies for notification fetch failures. Production wires
 * these to console + Sentry; tests inject spies to verify behavior.
 */
export interface NotificationFetchErrorReporterDeps {
  log: (message: string, error: unknown) => void;
  capture: (error: unknown) => void;
}

/**
 * Reports a notification fetch failure: logs to the provided sink and forwards
 * the error to the capture sink (Sentry in production). Pure with respect to
 * its dependencies: no module-level side-effects, no hidden global access.
 */
export const reportNotificationFetchError = (
  error: unknown,
  deps: NotificationFetchErrorReporterDeps,
): void => {
  deps.log(NOTIFICATION_FETCH_ERROR_LOG_PREFIX, error);
  deps.capture(error);
};
