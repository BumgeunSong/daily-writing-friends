/**
 * DOM id to scroll to when arriving from a notification deep link.
 *
 * Prefers the parent comment: comments are always rendered once the post loads,
 * whereas replies are lazily rendered only after their comment is expanded, so a
 * `reply-*` target may not exist. Falls back to the reply id when no parent
 * comment is known (reply-on-post / mention-on-reply carry no commentId).
 * Returns null when there is nothing to scroll to (e.g. like-on-post).
 */
export function resolveDeepLinkScrollTargetId(
  commentId: string | null | undefined,
  replyId: string | null | undefined,
): string | null {
  if (commentId) return `comment-${commentId}`;
  if (replyId) return `reply-${replyId}`;
  return null;
}
