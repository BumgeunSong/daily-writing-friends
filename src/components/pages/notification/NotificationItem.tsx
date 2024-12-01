import React from 'react';
import { Link } from 'react-router-dom';
import { Notification, NotificationType } from '@/types/Notification';
import { MessageSquare } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface NotificationItemProps {
  notification: Notification;
}

const getNotificationIcon = (type: NotificationType): React.ReactNode => {
  switch (type) {
    case NotificationType.COMMENT_ON_POST:
      return <MessageSquare className='size-4' />;
    case NotificationType.REPLY_ON_COMMENT:
      return <MessageSquare className='size-4' />;
    case NotificationType.REPLY_ON_POST:
      return <MessageSquare className='size-4' />;
    default:
      return null;
  }
};

function getNotificationLink(notification: Notification): string {
  return `/board/${notification.boardId}/post/${notification.postId}`;
}

export const NotificationItem = ({ notification }: NotificationItemProps) => {
    return (
      <Link to={getNotificationLink(notification)}>
        <div
          className={`flex cursor-pointer items-start gap-3 border-b px-4 py-3 transition-all hover:bg-accent/50 ${
            !notification.read ? 'bg-accent/30' : ''
          }`}
        >
          <Avatar>
            <AvatarImage src={notification.fromUserProfileImage} alt="User Avatar" />
            <AvatarFallback>
              {notification.fromUserId.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className='flex-1 space-y-1'>
            <p className='text-sm font-medium leading-tight text-foreground'>
              {notification.message}
            </p>
            <span className='text-[11px] text-muted-foreground/80'>
              {notification.timestamp.toDate().toLocaleString()}
            </span>
          </div>
        </div>
      </Link>
    );
  };
  