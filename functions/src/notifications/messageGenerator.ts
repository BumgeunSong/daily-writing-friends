import { NotificationType } from "../types/Notification";

const MAX_CONTENT_LENGTH = 35;

export const generateMessage = (notificationType: NotificationType, userName: string, contentTitle: string) => {
    const contentSnippet = generateContentSnippet(contentTitle);
    switch (notificationType) { 
        case NotificationType.COMMENT_ON_POST:
            return `${userName}님이 ${contentSnippet} 글에 댓글을 달았어요.`;
        case NotificationType.REPLY_ON_COMMENT:
            return `${userName}님이 ${contentSnippet} 댓글에 답글을 달았어요.`;
        case NotificationType.REPLY_ON_POST:
            return `${userName}님이 ${contentSnippet} 글에 답글을 달았어요.`;
    }
}

const generateContentSnippet = (contentTitle: string) => {
    if (contentTitle.length > MAX_CONTENT_LENGTH) {
        return contentTitle.slice(0, MAX_CONTENT_LENGTH) + "...";
    }
    return contentTitle;
}