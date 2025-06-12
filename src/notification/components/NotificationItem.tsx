import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Notification, NotificationType } from '@/notification/model/Notification';
import { usePostTitle } from '@/post/utils/postUtils';
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/ui/avatar';
import { useUserNickname } from '@/user/hooks/useUserNickname';

interface NotificationItemProps {
  notification: Notification;
}

function getNotificationLink(notification: Notification): string {
  return `/board/${notification.boardId}/post/${notification.postId}`;
}

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  const { data: postTitle } = usePostTitle(notification.boardId, notification.postId);
  const { nickname: userNickName } = useUserNickname(notification.fromUserId);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (postTitle && userNickName) {
      generateMessage(notification, postTitle, userNickName).then(setMessage);
    }
  }, [notification, postTitle, userNickName]);

  return (
    <Link to={getNotificationLink(notification)}>
      <div
        className={`flex cursor-pointer items-start gap-3 border-b border-border/30 px-3 md:px-4 py-3 reading-hover reading-focus active:scale-[0.99] transition-all duration-200 ${!notification.read ? 'bg-accent/20' : ''
          }`}
      >
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={notification.fromUserProfileImage} alt="User Avatar" />
          <AvatarFallback>
            {notification.fromUserId.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className='flex-1 space-y-1.5 min-w-0'>
          <p className='text-sm font-medium text-reading text-foreground'>
            {message}
          </p>
          <span className='text-xs text-muted-foreground'>
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
