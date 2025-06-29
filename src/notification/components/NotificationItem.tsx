import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Notification, NotificationType } from '@/notification/model/Notification';
import { usePostTitle } from '@/post/utils/postUtils';
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/ui/avatar';
import { useUserNickname } from '@/user/hooks/useUserNickname';
import { useCommentContent } from '@/comment/hooks/useCommentContent';
import { useReplyContent } from '@/comment/hooks/useReplyContent';

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

  // 댓글/답글 content fetch (content만)
  const commentContentObj =
    notification.type === NotificationType.REACTION_ON_COMMENT && notification.commentId
      ? useCommentContent(notification.boardId, notification.postId, notification.commentId)
      : null;
  const replyContentObj =
    notification.type === NotificationType.REACTION_ON_REPLY &&
    notification.commentId &&
    notification.replyId
      ? useReplyContent(
          notification.boardId,
          notification.postId,
          notification.commentId,
          notification.replyId,
        )
      : null;

  const commentSnippet = commentContentObj ? getSnippet(commentContentObj.content) : '';
  const replySnippet = replyContentObj ? getSnippet(replyContentObj.content) : '';

  useEffect(() => {
    if (postTitle && userNickName) {
      generateMessage(notification, postTitle, userNickName, commentSnippet, replySnippet).then(
        setMessage,
      );
    }
  }, [notification, postTitle, userNickName, commentSnippet, replySnippet]);

  return (
    <Link to={getNotificationLink(notification)}>
      <div
        className={`flex cursor-pointer items-start gap-3 border-b border-border/30 px-3 md:px-4 py-3 nav-hover reading-focus active:scale-[0.99] transition-all duration-200 ${
          !notification.read ? 'bg-card' : ''
        }`}
      >
        <Avatar className='size-10 shrink-0'>
          <AvatarImage src={notification.fromUserProfileImage} alt='User Avatar' />
          <AvatarFallback>{notification.fromUserId.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className='flex-1 space-y-1.5 min-w-0'>
          <p className='text-sm font-medium text-reading text-foreground'>{message}</p>
          <span className='text-xs text-muted-foreground'>
            {notification.timestamp.toDate().toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
};

const generateMessage = async (
  notification: Notification,
  postTitle: string,
  userNickName: string,
  commentSnippet?: string,
  replySnippet?: string,
): Promise<string> => {
  const postTitleSnippet = getSnippet(postTitle || '');

  switch (notification.type) {
    case NotificationType.COMMENT_ON_POST:
      return `${userNickName}님이 ${postTitleSnippet} 글에 댓글을 달았어요.`;
    case NotificationType.REPLY_ON_COMMENT:
      return `${userNickName}님이 ${postTitleSnippet} 댓글에 답글을 달았어요.`;
    case NotificationType.REPLY_ON_POST:
      return `${userNickName}님이 ${postTitleSnippet} 글에 답글을 달았어요.`;
    case NotificationType.REACTION_ON_COMMENT:
      return `${userNickName}님이 ${commentSnippet ?? ''} 댓글에 반응을 남겼어요.`;
    case NotificationType.REACTION_ON_REPLY:
      return `${userNickName}님이 ${replySnippet ?? ''} 답글에 반응을 남겼어요.`;
  }
};

const MAX_CONTENT_LENGTH = 30;
// snippet 생성 함수
const getSnippet = (content: string | null | undefined) => {
  if (!content) return '';
  return content.length > MAX_CONTENT_LENGTH
    ? content.slice(0, MAX_CONTENT_LENGTH) + '...'
    : content;
};
