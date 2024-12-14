import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import NotificationsHeader from './NotificationsHeader';
import NotificationsList from './NotificationsList';
import { useAuth } from '@/contexts/AuthContext';
import StatusMessage from '@/components/common/StatusMessage';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
const NotificationsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [inViewRef, inView] = useInView();
  const [limitCount] = useState(10);

  const {
    data: notifications,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications(currentUser?.uid, limitCount);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  if (isLoading) return <StatusMessage isLoading={isLoading} />;
  if (isError) return <StatusMessage error={isError} />;

  const allNotifications = notifications?.pages.flatMap((page) => page) || [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <NotificationsHeader />
      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <NotificationsList notifications={allNotifications} />
          <div ref={inViewRef} />
          {isFetchingNextPage && (
            <div className="flex justify-center items-center p-4">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
};

export default NotificationsPage;

