import React, { useRef } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import NotificationsHeader from './NotificationsHeader';
import NotificationsList from './NotificationsList';
import { useAuth } from '@/contexts/AuthContext';
import StatusMessage from '@/components/common/StatusMessage';
import { Loader2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Skeleton } from '@/components/ui/skeleton';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useRegisterTabHandler } from '@/contexts/BottomTabHandlerContext';
import { flattenNotificationPages } from '@/utils/notificationUtils';
import { useNotificationRefresh } from '@/hooks/useNotificationRefresh';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

// DATA - Constants
const NOTIFICATIONS_CONFIG = {
  SCROLL_ID: 'notifications-scroll',
  LIMIT_COUNT: 10,
  SKELETON_COUNT: 10,
} as const;

const NotificationsPage: React.FC = () => {
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

  // CALCULATION - Render loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <NotificationsHeader />
        <Card className="flex-1 overflow-hidden">
          <ScrollArea className="h-full" id={NOTIFICATIONS_CONFIG.SCROLL_ID}>
            <div ref={scrollRef}>
              {Array.from({ length: NOTIFICATIONS_CONFIG.SKELETON_COUNT }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full mb-4" />
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    );
  }

  // CALCULATION - Render error state
  if (isError) return <StatusMessage error={isError} />;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <NotificationsHeader />
      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" id={NOTIFICATIONS_CONFIG.SCROLL_ID}>
          <div ref={scrollRef}>
            <NotificationsList notifications={allNotifications} />
            <div ref={observerRef} />
            {isLoadingMore && (
              <div className="flex justify-center items-center p-4">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
};

export default NotificationsPage;

