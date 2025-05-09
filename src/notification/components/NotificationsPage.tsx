import { useRef } from 'react';
import StatusMessage from '@/components/common/StatusMessage';
import { useAuth } from '@shared/hooks/useAuth';
import { useRegisterTabHandler } from '@/contexts/BottomTabHandlerContext';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useNotificationRefresh } from '@/hooks/useNotificationRefresh';
import { useNotifications } from '@/hooks/useNotifications';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { flattenNotificationPages } from '@/utils/notificationUtils';
import { NotificationsContent } from './NotificationsContent';
import { NotificationsErrorBoundary } from './NotificationsErrorBoundary';
import NotificationsHeader from './NotificationsHeader';
import { NotificationsLoading } from './NotificationsLoading';

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

