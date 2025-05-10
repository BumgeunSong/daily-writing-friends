import { useRef } from 'react';
import StatusMessage from '@/shared/components/StatusMessage';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRegisterTabHandler } from '@/shared/contexts/BottomTabHandlerContext';
import { useInfiniteScroll } from '@/notification/hooks/useInfiniteScroll';
import { useNotificationRefresh } from '@/notification/hooks/useNotificationRefresh';
import { useNotifications } from '@/notification/hooks/useNotifications';
import { usePerformanceMonitoring } from '@/shared/hooks/usePerformanceMonitoring';
import { flattenNotificationPages } from '@/notification/utils/notificationUtils';
import { NotificationsContent } from '@/notification/components/NotificationsContent';
import { NotificationsErrorBoundary } from '@/notification/components/NotificationsErrorBoundary';
import NotificationsHeader from '@/notification/components/NotificationsHeader';
import { NotificationsLoading } from '@/notification/components/NotificationsLoading';

// DATA - Constants
const NOTIFICATIONS_CONFIG = {
  SCROLL_ID: 'notifications-scroll',
  LIMIT_COUNT: 10,
  SKELETON_COUNT: 10,
} as const;

/**
 * 알림 목록 페이지 컴포넌트
 */
const NotificationsPage = () => {
  // ACTION - Performance monitoring
  usePerformanceMonitoring('NotificationsPage');
  
  // DATA - State and refs
  const { currentUser } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // ACTION - Fetch notifications
  const {
    data: notifications,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useNotifications(currentUser?.uid, NOTIFICATIONS_CONFIG.LIMIT_COUNT);

  // ACTION - Notification refresh handler
  const { refresh: handleRefreshNotifications } = useNotificationRefresh({
    scrollAreaId: NOTIFICATIONS_CONFIG.SCROLL_ID,
    userId: currentUser?.uid
  });

  // ACTION - Infinite scroll handler
  const { observerRef, isLoading: isLoadingMore } = useInfiniteScroll({
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  });
  
  // ACTION - Register tab handler
  useRegisterTabHandler('Notifications', handleRefreshNotifications);

  // CALCULATION - Transform data for rendering
  const allNotifications = flattenNotificationPages(notifications?.pages);

  // CALCULATION - Render states
  if (isLoading) {
    return (
      <NotificationsLoading 
        scrollAreaId={NOTIFICATIONS_CONFIG.SCROLL_ID}
        skeletonCount={NOTIFICATIONS_CONFIG.SKELETON_COUNT}
      />
    );
  }

  if (isError) {
    return <StatusMessage error={isError} />;
  }

  return (
    <NotificationsErrorBoundary>
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <NotificationsHeader />
        <NotificationsContent
          scrollAreaId={NOTIFICATIONS_CONFIG.SCROLL_ID}
          notifications={allNotifications}
          scrollRef={scrollRef}
          observerRef={observerRef}
          isLoadingMore={isLoadingMore}
        />
      </div>
    </NotificationsErrorBoundary>
  );
};

export default NotificationsPage;

