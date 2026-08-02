import type { Database } from '@/shared/external/database.types';
import { type FirebaseTimestamp, createTimestamp } from '@/shared/model/Timestamp';

/**
 * The `notifications` columns the boundary reads. Derived from the generated
 * schema so a column rename surfaces here at compile time.
 */
export type SupabaseNotificationRow = Pick<
  Database['public']['Tables']['notifications']['Row'],
  | 'id'
  | 'type'
  | 'board_id'
  | 'post_id'
  | 'comment_id'
  | 'reply_id'
  | 'actor_id'
  | 'message'
  | 'created_at'
  | 'read'
>;

/** Columns fetched to satisfy SupabaseNotificationRow — keep in sync with the Pick above. */
export const NOTIFICATION_SELECT =
  'id, type, board_id, post_id, comment_id, reply_id, actor_id, message, created_at, read';

/** Fields shared by every notification variant, independent of its type. */
export interface NotificationBaseFields {
  id: string;
  boardId: string;
  postId: string;
  fromUserId: string;
  message: string;
  timestamp: FirebaseTimestamp;
  read: boolean;
}

/**
 * Pure: project the variant-independent columns onto the domain base. These
 * columns are non-null in the schema, so the projection never throws. Variant
 * validation (type + required ids) lives in the parser.
 */
export function mapNotificationBase(row: SupabaseNotificationRow): NotificationBaseFields {
  return {
    id: row.id,
    boardId: row.board_id,
    postId: row.post_id,
    fromUserId: row.actor_id,
    message: row.message,
    timestamp: createTimestamp(new Date(row.created_at)),
    read: row.read,
  };
}
