import React from 'react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import NotificationsHeader from './NotificationsHeader';
import NotificationsList from './NotificationsList';
import { Notification, NotificationType } from '@/types/Notification';
import { Timestamp } from 'firebase/firestore';

const NotificationsPage: React.FC = () => {
  return (
    <div className='container mx-auto max-w-2xl py-8'>
      <NotificationsHeader />
      <Card className='overflow-hidden'>
        <ScrollArea className='h-[600px]'>
          <NotificationsList notifications={MOCK_NOTIFICATIONS} />
        </ScrollArea>
      </Card>
    </div>
  );
};

export default NotificationsPage;
