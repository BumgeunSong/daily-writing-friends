import { useCommentContent } from '@/comment/hooks/useCommentContent';
import { useReplyContent } from '@/comment/hooks/useReplyContent';
import { Notification, NotificationType } from '@/notification/model/Notification';
import { usePostTitle } from '@/post/utils/postUtils';
import { useUserNickname } from '@/user/hooks/useUserNickname';

const MAX_CONTENT_LENGTH = 30;
function getSnippet(content: string | null | undefined) {
  if (!content) return '';
  return content.length > MAX_CONTENT_LENGTH
    ? content.slice(0, MAX_CONTENT_LENGTH) + '...'
    : content;
}

export function useNotificationMessage(notification: Notification): string {
  // post title
  const { data: postTitle } = usePostTitle(notification.boardId, notification.postId);
  // user nickname
  const { nickname: userNickName } = useUserNickname(notification.fromUserId);
  // 댓글/답글 내용
  const shouldFetchComment = notification.type === NotificationType.REACTION_ON_COMMENT && notification.commentId;
  const shouldFetchReply = notification.type === NotificationType.REACTION_ON_REPLY && notification.commentId && notification.replyId;
  
  const commentContentObj = useCommentContent(
    notification.boardId, 
    notification.postId, 
    notification.commentId || '', 
    { enabled: shouldFetchComment }
  );
  const replyContentObj = useReplyContent(
    notification.boardId,
    notification.postId,
    notification.commentId || '',
    notification.replyId || '',
    { enabled: shouldFetchReply }
  );
  const commentSnippet = commentContentObj ? getSnippet(commentContentObj.content) : '';
  const replySnippet = replyContentObj ? getSnippet(replyContentObj.content) : '';
  const postTitleSnippet = getSnippet(postTitle || '');

  if (!userNickName) return '';

  switch (notification.type) {
    case NotificationType.COMMENT_ON_POST:
      return `${userNickName}님이 ${postTitleSnippet} 글에 댓글을 달았어요.`;
    case NotificationType.REPLY_ON_COMMENT:
      return `${userNickName}님이 ${postTitleSnippet} 댓글에 답글을 달았어요.`;
    case NotificationType.REPLY_ON_POST:
      return `${userNickName}님이 ${postTitleSnippet} 글에 답글을 달았어요.`;
    case NotificationType.REACTION_ON_COMMENT:
      return `${userNickName}님이 ${commentSnippet} 댓글에 반응을 남겼어요.`;
    case NotificationType.REACTION_ON_REPLY:
      return `${userNickName}님이 ${replySnippet} 답글에 반응을 남겼어요.`;
    default:
      return '';
  }
}
