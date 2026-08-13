import { assertEquals } from 'jsr:@std/assert@1';
import { computeNotificationRecipients } from './notificationRecipients.ts';

Deno.test('computeNotificationRecipients', async (t) => {
  await t.step('멘션이 없으면 구조적 수신자 1명', () => {
    const rows = computeNotificationRecipients({
      structuralRecipientId: 'author-1',
      structuralType: 'comment_on_post',
      mentionType: 'mention_on_comment',
      mentionUserIds: [],
      actorId: 'actor-1',
    });
    assertEquals(rows, [{ recipientId: 'author-1', type: 'comment_on_post' }]);
  });

  await t.step('구조적 수신자가 본인이면 제외', () => {
    const rows = computeNotificationRecipients({
      structuralRecipientId: 'actor-1',
      structuralType: 'comment_on_post',
      mentionType: 'mention_on_comment',
      mentionUserIds: [],
      actorId: 'actor-1',
    });
    assertEquals(rows, []);
  });

  await t.step('구조적 수신자가 없으면 빈 목록', () => {
    const rows = computeNotificationRecipients({
      structuralRecipientId: null,
      structuralType: 'comment_on_post',
      mentionType: 'mention_on_comment',
      mentionUserIds: [],
      actorId: 'actor-1',
    });
    assertEquals(rows, []);
  });

  await t.step('멘션과 구조적 수신자가 겹치지 않으면 둘 다 포함', () => {
    const rows = computeNotificationRecipients({
      structuralRecipientId: 'author-1',
      structuralType: 'comment_on_post',
      mentionType: 'mention_on_comment',
      mentionUserIds: ['mentioned-1', 'mentioned-2'],
      actorId: 'actor-1',
    });
    assertEquals(rows, [
      { recipientId: 'mentioned-1', type: 'mention_on_comment' },
      { recipientId: 'mentioned-2', type: 'mention_on_comment' },
      { recipientId: 'author-1', type: 'comment_on_post' },
    ]);
  });

  await t.step('구조적 수신자가 멘션되면 구조적 알림은 생략하고 멘션만(멘션 우선)', () => {
    const rows = computeNotificationRecipients({
      structuralRecipientId: 'author-1',
      structuralType: 'comment_on_post',
      mentionType: 'mention_on_comment',
      mentionUserIds: ['author-1'],
      actorId: 'actor-1',
    });
    assertEquals(rows, [{ recipientId: 'author-1', type: 'mention_on_comment' }]);
  });

  await t.step('자기 자신을 멘션하면 그 멘션 행은 제외', () => {
    const rows = computeNotificationRecipients({
      structuralRecipientId: 'author-1',
      structuralType: 'reply_on_comment',
      mentionType: 'mention_on_reply',
      mentionUserIds: ['actor-1', 'mentioned-2'],
      actorId: 'actor-1',
    });
    assertEquals(rows, [
      { recipientId: 'mentioned-2', type: 'mention_on_reply' },
      { recipientId: 'author-1', type: 'reply_on_comment' },
    ]);
  });

  await t.step('멘션 소스가 없으면(reaction/like 등) 구조적 수신자만', () => {
    const rows = computeNotificationRecipients({
      structuralRecipientId: 'author-1',
      structuralType: 'reaction_on_comment',
      mentionType: null,
      mentionUserIds: ['mentioned-1'],
      actorId: 'actor-1',
    });
    assertEquals(rows, [{ recipientId: 'author-1', type: 'reaction_on_comment' }]);
  });
});
