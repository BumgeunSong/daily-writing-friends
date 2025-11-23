import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useScrollAreaControl } from '@/notification/hooks/useScrollAreaControl';
import { createNotificationQueryKey } from '@/notification/utils/notificationUtils';

interface NotificationRefreshOptions {
  scrollAreaId: string;
  userId: string | null;
}

/**
 * 알림 목록 새로고침을 처리하는 커스텀 훅
 * - 스크롤 위치를 최상단으로 이동
 * - 알림 데이터를 새로고침
 */
export const useNotificationRefresh = ({ scrollAreaId, userId }: NotificationRefreshOptions) => {
  const queryClient = useQueryClient();
  const { scrollAreaToTop } = useScrollAreaControl(`#${scrollAreaId}`);

  return {
    refresh: useCallback(() => {
      // ACTION - 스크롤 위치 초기화
      scrollAreaToTop();

      // ACTION - 알림 데이터 새로고침
      if (userId) {
        queryClient.invalidateQueries(createNotificationQueryKey(userId));
      }
    }, [scrollAreaToTop, queryClient, userId]),
  };
}; 