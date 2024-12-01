import React from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import NotificationsHeader from './NotificationsHeader';
import NotificationsList from './NotificationsList';
import { Notification, NotificationType } from '@/types/Notification';
import { Timestamp } from 'firebase/firestore';

const NotificationsPage: React.FC = () => {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <NotificationsHeader />
      <Card className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <NotificationsList notifications={MOCK_NOTIFICATIONS} />
        </ScrollArea>
      </Card>
    </div>
  );
};

export default NotificationsPage;
