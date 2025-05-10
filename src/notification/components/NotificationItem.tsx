import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/ui/avatar';
import { Notification, NotificationType } from '@/notification/model/Notification';
import { usePostTitle } from '@/post/utils/postUtils';
import { useUserNickname } from '@/user/utils/userUtils';

interface NotificationItemProps {
  notification: Notification;
}

function getNotificationLink(notification: Notification): string {
  return `/board/${notification.boardId}/post/${notification.postId}`;
}

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  const { data: postTitle } = usePostTitle(notification.boardId, notification.postId);
  const { data: userNickName } = useUserNickname(notification.fromUserId);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (postTitle && userNickName) {
      generateMessage(notification, postTitle, userNickName).then(setMessage);
    }
  }, [notification, postTitle, userNickName]);

  return (
    <Link to={getNotificationLink(notification)}>
      <div
        className={`flex cursor-pointer items-start gap-3 border-b px-4 py-3 transition-all hover:bg-accent/50 ${!notification.read ? 'bg-accent/30' : ''
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
            {message}
          </p>
          <span className='text-[11px] text-muted-foreground/80'>
            {notification.timestamp.toDate().toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
};

const generateMessage = async (notification: Notification, postTitle: string, userNickName: string): Promise<string> => {
  const postTitleSnippet = generateTitleSnippet(postTitle || '');

  switch (notification.type) {
    case NotificationType.COMMENT_ON_POST:
      return `${userNickName}님이 ${postTitleSnippet} 글에 댓글을 달았어요.`;
    case NotificationType.REPLY_ON_COMMENT:
      return `${userNickName}님이 ${postTitleSnippet} 댓글에 답글을 달았어요.`;
    case NotificationType.REPLY_ON_POST:
      return `${userNickName}님이 ${postTitleSnippet} 글에 답글을 달았어요.`;
    default:
      return `${userNickName}님이 알림을 보냈습니다.`;
  }
};

const generateTitleSnippet = (contentTitle: string) => {
  if (contentTitle.length > 12) {
    return contentTitle.slice(0, 12) + "...";
  }
  return contentTitle;
};
