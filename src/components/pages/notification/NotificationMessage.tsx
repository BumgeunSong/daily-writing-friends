import { NotificationType } from "@/types/Notification";

interface NotificationMessageProps {
    userNickName: string;
    postTitle: string;
    notificationType: NotificationType;
}

export const NotificationMessage = ({ userNickName, postTitle, notificationType }: NotificationMessageProps) => {
  switch (notificationType) {
      case NotificationType.COMMENT_ON_POST:
        return (
          <>
            {userNickName}님이 <strong>'{postTitleSnippet(postTitle)}'</strong> 글에 댓글을 달았어요.
          </>
        );
      case NotificationType.REPLY_ON_COMMENT:
        return (
          <>
            {userNickName}님이 <strong>'{postTitleSnippet(postTitle)}'</strong> 댓글에 답글을 달았어요.
          </>
        );
      case NotificationType.REPLY_ON_POST:
        return (
          <>
            {userNickName}님이 <strong>'{postTitleSnippet(postTitle)}'</strong> 글에 답글을 달았어요.
          </>
        );
    }
  };
  
  const postTitleSnippet = (contentTitle: string) => {
    if (contentTitle.length > 24) {
      return contentTitle.slice(0, 24) + "...";
    }
    return contentTitle;
  };