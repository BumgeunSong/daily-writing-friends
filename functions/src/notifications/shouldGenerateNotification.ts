import { NotificationType } from '../types/Notification';

export const shouldGenerateNotification = (
  notificationType: NotificationType,
  fromUserId: string,
  toUserId: string,
) => {
  switch (notificationType) {
    case NotificationType.COMMENT_ON_POST:
      return fromUserId !== toUserId;
    case NotificationType.REPLY_ON_COMMENT:
      return fromUserId !== toUserId;
    case NotificationType.REPLY_ON_POST:
      return fromUserId !== toUserId;
    case NotificationType.REACTION_ON_COMMENT:
      return fromUserId !== toUserId;
    case NotificationType.REACTION_ON_REPLY:
      return fromUserId !== toUserId;
  }
};
