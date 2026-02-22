export type NotificationType =
  | 'comment_on_post'
  | 'reply_on_post'
  | 'reply_on_comment'
  | 'like_on_post'
  | 'reaction_on_comment'
  | 'reaction_on_reply';

/**
 * 알림 메시지를 생성하는 순수 함수
 *
 * @param type - 알림 유형
 * @param actorName - 행위자 이름
 * @param contentPreview - 대상 콘텐츠 미리보기 (35자 초과 시 말줄임표 추가)
 */
export function buildNotificationMessage(
  type: NotificationType,
  actorName: string,
  contentPreview: string,
): string {
  const preview = contentPreview.length > 35
    ? contentPreview.slice(0, 35) + '...'
    : contentPreview;

  switch (type) {
    case 'comment_on_post':
      return `${actorName}님이 '${preview}' 글에 댓글을 달았어요.`;
    case 'like_on_post':
      return `${actorName}님이 '${preview}' 글에 좋아요를 눌렀어요.`;
    case 'reply_on_post':
      return `${actorName}님이 '${preview}' 글에 답글을 달았어요.`;
    case 'reply_on_comment':
      return `${actorName}님이 '${preview}' 댓글에 답글을 달았어요.`;
    case 'reaction_on_comment':
      return `${actorName}님이 '${preview}' 댓글에 반응했어요.`;
    case 'reaction_on_reply':
      return `${actorName}님이 '${preview}' 답글에 반응했어요.`;
  }
}

/**
 * 자기 자신에게 알림을 보내지 않아야 하는지 확인
 */
export function shouldSkipNotification(
  recipientId: string | null,
  authorId: string,
): boolean {
  return !recipientId || recipientId === authorId;
}
