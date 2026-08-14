import type { Notification } from '@/notification/model/Notification';

/**
 * Deep link for a notification: the post URL plus the comment/reply the
 * notification is about, as query params the post page consumes to scroll to
 * the target. Carries whatever ids the variant has — `commentId` and/or
 * `replyId` — so like-on-post links to the bare post.
 */
export function buildNotificationLink(notification: Notification): string {
  const base = `/board/${notification.boardId}/post/${notification.postId}`;
  const params = new URLSearchParams();

  if ('commentId' in notification) params.set('commentId', notification.commentId);
  if ('replyId' in notification) params.set('replyId', notification.replyId);

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}
