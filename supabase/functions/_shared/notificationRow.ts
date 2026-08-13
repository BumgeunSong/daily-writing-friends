import { buildNotificationMessage, type NotificationType } from './notificationMessages.ts';
import type { RecipientTarget } from './notificationRecipients.ts';

export interface NotificationRowContext {
  actorId: string;
  actorName: string;
  boardId: string;
  postId: string;
  commentId: string | null;
  replyId: string | null;
  /**
   * Canonical post_id for mention_on_reply rows, taken from the reply itself.
   * The reply fires this function twice (reply_on_post / reply_on_comment) which
   * derive postId from different sources; both mention rows must share one
   * post_id or the idempotency key diverges and dedup fails.
   */
  replyPostId: string | null;
  structuralPreview: string;
  mentionPreview: string;
  reactionId?: string | null;
  likeId?: string | null;
}

function isMentionType(type: NotificationType): boolean {
  return type === 'mention_on_comment' || type === 'mention_on_reply';
}

/**
 * Builds a notifications-table row for one recipient target.
 *
 * The id-column selection is load-bearing: mention rows carry ONLY their own id
 * column (never the sibling) so the two reply-trigger invocations produce an
 * identical idempotency key. Structural rows keep the legacy behaviour of
 * attaching whatever context ids are present.
 */
export function buildNotificationRow(
  target: RecipientTarget,
  ctx: NotificationRowContext,
): Record<string, unknown> {
  const mention = isMentionType(target.type);
  const preview = mention ? ctx.mentionPreview : ctx.structuralPreview;
  const postId =
    target.type === 'mention_on_reply' && ctx.replyPostId ? ctx.replyPostId : ctx.postId;

  const row: Record<string, unknown> = {
    recipient_id: target.recipientId,
    type: target.type,
    actor_id: ctx.actorId,
    board_id: ctx.boardId,
    post_id: postId,
    message: buildNotificationMessage(target.type, ctx.actorName, preview),
    read: false,
  };

  if (target.type === 'mention_on_comment') {
    row.comment_id = ctx.commentId;
  } else if (target.type === 'mention_on_reply') {
    row.reply_id = ctx.replyId;
  } else {
    if (ctx.commentId) row.comment_id = ctx.commentId;
    if (ctx.replyId) row.reply_id = ctx.replyId;
    if (ctx.reactionId) row.reaction_id = ctx.reactionId;
    if (ctx.likeId) row.like_id = ctx.likeId;
  }

  return row;
}

export type InsertOutcome = 'created' | 'duplicate' | 'failed';

/**
 * Classifies a per-row insert result. Postgres unique_violation (23505) is a
 * benign duplicate: the mention fan-out relies on the idempotency index to
 * collapse the two reply-trigger calls, so a conflict is expected, not a failure.
 */
export function classifyInsertResult(error: { code?: string } | null | undefined): InsertOutcome {
  if (!error) return 'created';
  if (error.code === '23505') return 'duplicate';
  return 'failed';
}
