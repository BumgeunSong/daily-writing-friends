import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import NotificationsHeader from './NotificationsHeader';
import NotificationsList from './NotificationsList';
import { useAuth } from '@/contexts/AuthContext';
import StatusMessage from '@/components/common/StatusMessage';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Skeleton } from '@/components/ui/skeleton';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useRegisterTabHandler } from '@/contexts/BottomTabHandlerContext';
import { useQueryClient } from '@tanstack/react-query';
import { useScrollAreaControl } from '@/hooks/useScrollAreaControl';

// 알림 목록을 위한 ScrollArea의 고유 ID
const NOTIFICATIONS_SCROLL_ID = 'notifications-scroll';

const NotificationsPage: React.FC = () => {
  usePerformanceMonitoring('NotificationsPage');
  const { currentUser } = useAuth();
  const [inViewRef, inView] = useInView();
  const [limitCount] = useState(10);
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // ScrollArea 제어 훅 사용
  const { scrollAreaToTop } = useScrollAreaControl(`#${NOTIFICATIONS_SCROLL_ID}`);

  const {
    data: notifications,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useNotifications(currentUser?.uid, limitCount);

  // 알림 새로고침 핸들러
  const handleRefreshNotifications = useCallback(() => {
    // 1. ScrollArea의 스크롤 위치를 최상단으로 이동
    scrollAreaToTop();
    
    // 2. 알림 관련 쿼리 캐시 무효화
    if (currentUser?.uid) {
      queryClient.invalidateQueries(['notifications', currentUser.uid]);
    }
    
    console.log('알림 데이터 새로고침 및 스크롤 위치 초기화');
  }, [scrollAreaToTop, queryClient, currentUser]);
  
  // Notifications 탭 핸들러 등록
  useRegisterTabHandler('Notifications', handleRefreshNotifications);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <NotificationsHeader />
        <Card className="flex-1 overflow-hidden">
          <ScrollArea className="h-full" id={NOTIFICATIONS_SCROLL_ID}>
            <div ref={scrollRef}>
              {Array.from({ length: 10 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full mb-4" />
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    );
  }
  if (isError) return <StatusMessage error={isError} />;

  const allNotifications = notifications?.pages.flatMap((page) => page) || [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <NotificationsHeader />
      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" id={NOTIFICATIONS_SCROLL_ID}>
          <div ref={scrollRef}>
            <NotificationsList notifications={allNotifications} />
            <div ref={inViewRef} />
            {isFetchingNextPage && (
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

