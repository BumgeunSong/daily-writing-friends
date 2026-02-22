import { assertEquals } from 'jsr:@std/assert@1';
import {
  buildNotificationMessage,
  shouldSkipNotification,
  type NotificationType,
} from '../_shared/notificationMessages.ts';

Deno.test('buildNotificationMessage', async (t) => {
  await t.step('comment_on_post: 글에 댓글 메시지 생성', () => {
    const result = buildNotificationMessage('comment_on_post', '홍길동', '오늘의 글');
    assertEquals(result, '홍길동님이 "오늘의 글" 글에 댓글을 달았어요.');
  });

  await t.step('like_on_post: 글에 좋아요 메시지 생성', () => {
    const result = buildNotificationMessage('like_on_post', '김철수', '멋진 하루');
    assertEquals(result, '김철수님이 "멋진 하루" 글에 좋아요를 눌렀어요.');
  });

  await t.step('reply_on_post: 글에 답글 메시지 생성', () => {
    const result = buildNotificationMessage('reply_on_post', '이영희', '주말 이야기');
    assertEquals(result, '이영희님이 "주말 이야기" 글에 답글을 달았어요.');
  });

  await t.step('reply_on_comment: 댓글에 답글 메시지 생성', () => {
    const result = buildNotificationMessage('reply_on_comment', '박민수', '좋은 글이네요');
    assertEquals(result, '박민수님이 "좋은 글이네요" 댓글에 답글을 달았어요.');
  });

  await t.step('reaction_on_comment: 댓글에 반응 메시지 생성', () => {
    const result = buildNotificationMessage('reaction_on_comment', '최지은', '공감합니다');
    assertEquals(result, '최지은님이 "공감합니다" 댓글에 반응했어요.');
  });

  await t.step('reaction_on_reply: 답글에 반응 메시지 생성', () => {
    const result = buildNotificationMessage('reaction_on_reply', '정수진', '감사해요');
    assertEquals(result, '정수진님이 "감사해요" 답글에 반응했어요.');
  });

  await t.step('긴 콘텐츠는 20자로 잘림', () => {
    const longContent = '이것은 매우 긴 제목입니다 스무 글자가 넘는 아주 긴 제목이에요';
    const result = buildNotificationMessage('comment_on_post', '테스트', longContent);
    // 20자까지만 포함
    assertEquals(result, `테스트님이 "${longContent.slice(0, 20)}" 글에 댓글을 달았어요.`);
  });

  await t.step('빈 콘텐츠 처리', () => {
    const result = buildNotificationMessage('like_on_post', '유저', '');
    assertEquals(result, '유저님이 "" 글에 좋아요를 눌렀어요.');
  });

  await t.step('빈 actorName 처리', () => {
    const result = buildNotificationMessage('comment_on_post', '', '제목');
    assertEquals(result, '님이 "제목" 글에 댓글을 달았어요.');
  });
});

Deno.test('shouldSkipNotification', async (t) => {
  await t.step('recipientId가 null이면 skip', () => {
    assertEquals(shouldSkipNotification(null, 'author-1'), true);
  });

  await t.step('recipientId와 authorId가 같으면 skip (자기 자신)', () => {
    assertEquals(shouldSkipNotification('user-1', 'user-1'), true);
  });

  await t.step('recipientId와 authorId가 다르면 알림 전송', () => {
    assertEquals(shouldSkipNotification('user-1', 'user-2'), false);
  });

  await t.step('빈 문자열 recipientId는 skip', () => {
    assertEquals(shouldSkipNotification('', 'author-1'), true);
  });
});
