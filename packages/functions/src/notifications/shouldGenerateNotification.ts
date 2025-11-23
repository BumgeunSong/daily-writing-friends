import { NotificationType } from '../shared/types/Notification';

// Prevent self-notifications for all interaction types
export const shouldGenerateNotification = (
  notificationType: NotificationType,
  fromUserId: string,
  toUserId: string,
) => {
  return fromUserId !== toUserId;
};
