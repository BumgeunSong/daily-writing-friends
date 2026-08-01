import { type Notification, NotificationType } from '@/notification/model/Notification';
import { createTimestamp } from '@/shared/model/Timestamp';

/**
 * Raw Supabase `notifications` row shape. Lives here (next to the parser) so
 * the row contract is owned at the trust boundary where it is consumed.
 */
export interface SupabaseNotificationRow {
  id: string;
  type: string;
  board_id: string;
  post_id: string;
  comment_id: string | null;
  reply_id: string | null;
  actor_id: string;
  message: string;
  created_at: string;
  read: boolean;
}

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

  const base = {
    id: row.id,
    boardId: row.board_id,
    postId: row.post_id,
    fromUserId: row.actor_id,
    message: row.message,
    timestamp: createTimestamp(new Date(row.created_at)),
    read: row.read,
  };

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

    default: {
      const _exhaustive: never = row.type;
      throw new Error(`Notification ${row.id}: unhandled notification type: ${String(_exhaustive)}`);
    }
  }
}
