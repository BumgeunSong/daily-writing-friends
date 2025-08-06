import { Link } from 'react-router-dom';
import { useNotificationMessage } from '@/notification/hooks/useNotificationMessage';
import { Notification } from '@/notification/model/Notification';
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/ui/avatar';

interface NotificationItemProps {
  notification: Notification;
}

function getNotificationLink(notification: Notification): string {
  return `/board/${notification.boardId}/post/${notification.postId}`;
}

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  const message = useNotificationMessage(notification);
  return (
    <Link to={getNotificationLink(notification)}>
      <div
        className={
          'flex cursor-pointer items-start gap-3 border-b border-border/30 px-3 md:px-4 py-3 nav-hover reading-focus active:scale-[0.99] transition-all duration-200 ' +
          (!notification.read ? 'bg-card' : '')
        }
      >
        <Avatar className='size-10 shrink-0'>
          <AvatarImage src={notification.fromUserProfileImage} alt='User Avatar' />
          <AvatarFallback>{notification.fromUserId.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className='min-w-0 flex-1 space-y-1.5'>
          <p className='text-reading text-sm font-medium text-foreground'>{message}</p>
          <span className='text-xs text-muted-foreground'>
            {notification.timestamp.toDate().toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
};
