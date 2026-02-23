import type { Notification } from '@/notification/model/Notification';
import { CardContent } from '@/shared/ui/card';
import { NotificationItem } from './NotificationItem';

interface NotificationsListProps {
  notifications: Notification[];
}

/**
 * 알림 목록을 렌더링하는 컴포넌트
 */
const NotificationsList = ({ notifications }: NotificationsListProps) => {
  if (notifications.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-muted-foreground">알림이 없습니다.</p>
      </div>
    );
  }

  return (
    <CardContent className='p-0'>
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
    </CardContent>
  );
};

export default NotificationsList;
