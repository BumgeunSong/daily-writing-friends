import React from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import NotificationsHeader from './NotificationsHeader';
import NotificationsList from './NotificationsList';
import { Notification, NotificationType } from '@/types/Notification';
import { Timestamp } from 'firebase/firestore';
import { getNotifications } from '@/utils/notificationUtils';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import StatusMessage from '@/components/common/StatusMessage';


const NotificationsPage: React.FC = () => {
  const { currentUser } = useAuth();

  const { data: notifications, isLoading, isError } = useQuery(
    ['notifications', currentUser?.uid],
    () => getNotifications(currentUser?.uid),
    {
      enabled: !!currentUser?.uid, // currentUser가 있을 때만 쿼리 실행
    }
  );

  if (isLoading) return <StatusMessage isLoading={isLoading} />;
  if (isError) return <StatusMessage error={isError} />;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <NotificationsHeader />
      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <NotificationsList notifications={notifications} />
        </ScrollArea>
      </Card>
    </div>
  );
};

export default NotificationsPage;
