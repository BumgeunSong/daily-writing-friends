import React from 'react';
import { Notification } from '@/types/Notification';
import { CardContent } from '@/components/ui/card';
import { NotificationItem } from './NotificationItem';

interface NotificationsListProps {
    notifications: Notification[];
  }
  
  export const NotificationsList = ({ notifications }: NotificationsListProps) => {
    return (
      <CardContent className='p-0'>
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </CardContent>
    );
};

export default NotificationsList;
