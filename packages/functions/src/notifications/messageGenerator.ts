import { NotificationType } from '../shared/types/Notification';

const MAX_CONTENT_LENGTH = 30;

export const generateMessage = (
  notificationType: NotificationType,
  userName: string,
  contentTitle: string,
): string => {
  const contentSnippet = generateContentSnippet(contentTitle);
  switch (notificationType) {
    case NotificationType.COMMENT_ON_POST:
      return `${userName}님이 ${contentSnippet} 글에 댓글을 달았어요.`;
    case NotificationType.REPLY_ON_COMMENT:
      return `${userName}님이 ${contentSnippet} 댓글에 답글을 달았어요.`;
    case NotificationType.REPLY_ON_POST:
      return `${userName}님이 ${contentSnippet} 글에 답글을 달았어요.`;
    case NotificationType.REACTION_ON_COMMENT:
      return `${userName}님이 댓글에 반응을 남겼어요.`;
    case NotificationType.REACTION_ON_REPLY:
      return `${userName}님이 답글에 반응을 남겼어요.`;
    case NotificationType.LIKE_ON_POST:
      return `${userName}님이 ${contentSnippet} 글에 공감했어요.`;
  }
};

const generateContentSnippet = (contentTitle: string) => {
  if (contentTitle.length > MAX_CONTENT_LENGTH) {
    return contentTitle.slice(0, MAX_CONTENT_LENGTH) + '...';
  }
  return contentTitle;
};
