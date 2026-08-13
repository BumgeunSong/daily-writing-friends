import type { NotificationType } from './notificationMessages.ts';

export interface RecipientTarget {
  recipientId: string;
  type: NotificationType;
}

/**
 * 한 실행에서 만들 알림 수신자 목록을 계산하는 순수 함수.
 *
 * 억제 규칙:
 * - 자기 자신에게는 절대 알리지 않는다(멘션·구조적 모두).
 * - 멘션이 구조적 알림보다 의도적이므로, 구조적 수신자가 멘션 대상이면
 *   구조적 알림을 생략하고 멘션 알림만 남긴다(멘션 우선).
 *
 * mentionUserIds 중복 제거와 게시판 권한 필터는 호출부 책임이다.
 */
export function computeNotificationRecipients(params: {
  structuralRecipientId: string | null;
  structuralType: NotificationType;
  mentionType: NotificationType | null;
  mentionUserIds: string[];
  actorId: string;
}): RecipientTarget[] {
  const { structuralRecipientId, structuralType, mentionType, mentionUserIds, actorId } = params;

  const mentionIds = mentionType ? mentionUserIds.filter((id) => id !== actorId) : [];
  const mentioned = new Set(mentionIds);

  const rows: RecipientTarget[] = mentionIds.map((recipientId) => ({
    recipientId,
    type: mentionType as NotificationType,
  }));

  const structural = structuralRecipientId;
  if (structural && structural !== actorId && !mentioned.has(structural)) {
    rows.push({ recipientId: structural, type: structuralType });
  }

  return rows;
}
