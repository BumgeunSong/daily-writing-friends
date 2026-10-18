import { type Notification, NotificationType } from '@/notification/model/Notification';

import { type SupabaseNotificationRow, mapNotificationBase } from './notification.mapper';

function isNotificationType(value: string): value is NotificationType {
  return Object.values(NotificationType).includes(value as NotificationType);
}

/**
 * Parses a raw Supabase notification row into a strongly-typed `Notification`.
 *
 * Throws on rows that violate the discriminated union invariants — invalid
 * `type`, or missing variant-required IDs. After this function returns, the
 * compiler enforces that the right IDs are present for each variant.
 */
export function parseNotificationRow(row: SupabaseNotificationRow): Notification {
  if (!isNotificationType(row.type)) {
    throw new Error(`Notification ${row.id}: unknown notification type: ${row.type}`);
  }

  const base = mapNotificationBase(row);

  switch (row.type) {
    case NotificationType.COMMENT_ON_POST:
      if (!row.comment_id) {
        throw new Error(`Notification ${row.id}: COMMENT_ON_POST missing commentId`);
      }
      return { ...base, type: NotificationType.COMMENT_ON_POST, commentId: row.comment_id };

    case NotificationType.REPLY_ON_COMMENT:
      if (!row.comment_id || !row.reply_id) {
        throw new Error(`Notification ${row.id}: REPLY_ON_COMMENT missing commentId or replyId`);
      }
      return {
        ...base,
        type: NotificationType.REPLY_ON_COMMENT,
        commentId: row.comment_id,
        replyId: row.reply_id,
      };

    case NotificationType.REPLY_ON_POST:
      if (!row.reply_id) {
        throw new Error(`Notification ${row.id}: REPLY_ON_POST missing replyId`);
      }
      return { ...base, type: NotificationType.REPLY_ON_POST, replyId: row.reply_id };

    case NotificationType.REACTION_ON_COMMENT:
      if (!row.comment_id) {
        throw new Error(`Notification ${row.id}: REACTION_ON_COMMENT missing commentId`);
      }
      return { ...base, type: NotificationType.REACTION_ON_COMMENT, commentId: row.comment_id };

    case NotificationType.REACTION_ON_REPLY:
      if (!row.comment_id || !row.reply_id) {
        throw new Error(`Notification ${row.id}: REACTION_ON_REPLY missing commentId or replyId`);
      }
      return {
        ...base,
        type: NotificationType.REACTION_ON_REPLY,
        commentId: row.comment_id,
        replyId: row.reply_id,
      };

    case NotificationType.LIKE_ON_POST:
      return { ...base, type: NotificationType.LIKE_ON_POST };

    case NotificationType.MENTION_ON_COMMENT:
      if (!row.comment_id) {
        throw new Error(`Notification ${row.id}: MENTION_ON_COMMENT missing commentId`);
      }
      return { ...base, type: NotificationType.MENTION_ON_COMMENT, commentId: row.comment_id };

    case NotificationType.MENTION_ON_REPLY:
      if (!row.reply_id) {
        throw new Error(`Notification ${row.id}: MENTION_ON_REPLY missing replyId`);
      }
      return { ...base, type: NotificationType.MENTION_ON_REPLY, replyId: row.reply_id };

    default: {
      const _exhaustive: never = row.type;
      throw new Error(`Notification ${row.id}: unhandled notification type: ${String(_exhaustive)}`);
    }
  }
}
