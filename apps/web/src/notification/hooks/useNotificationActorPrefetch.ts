import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Notification } from '@/notification/model/Notification';
import { fetchBatchUsersBasic } from '@/user/api/userReads';
import { mapBasicRowToUserBasic, userBasicQueryKey } from '@/user/hooks/useUserBasic';

/**
 * Prefetches the avatar/name cache for each notification's actor in a single
 * IN-query, so per-row {@link useUserBasic} calls in NotificationItem hit the
 * cache instead of firing N parallel single-row requests on cold cache.
 *
 * Runs as a post-render effect so the notifications LCP path is unaffected;
 * worst case is the per-row requests still fire before this resolves, in
 * which case they populate the same cache themselves.
 */
export function useNotificationActorPrefetch(notifications: Notification[]): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (notifications.length === 0) return;

    const missingActorIds = collectMissingActorIds(notifications, (id) =>
      queryClient.getQueryData(userBasicQueryKey(id)) !== undefined,
    );
    if (missingActorIds.length === 0) return;

    let cancelled = false;
    fetchBatchUsersBasic(missingActorIds)
      .then((rows) => {
        if (cancelled) return;
        for (const row of rows) {
          queryClient.setQueryData(userBasicQueryKey(row.id), mapBasicRowToUserBasic(row));
        }
      })
      .catch(() => {
        // Per-row useUserBasic queries remain as the fetch path of last resort.
      });

    return () => {
      cancelled = true;
    };
  }, [notifications, queryClient]);
}

function collectMissingActorIds(
  notifications: Notification[],
  isCached: (id: string) => boolean,
): string[] {
  const uniqueIds = new Set(notifications.map((n) => n.fromUserId).filter(Boolean));
  return Array.from(uniqueIds).filter((id) => !isCached(id));
}
