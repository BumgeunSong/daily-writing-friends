import { describe, expect, it } from 'vitest';

import { mapNotificationBase } from './notification.mapper';

describe('알림 로우의 공통 필드를 도메인 베이스로 매핑할 때', () => {
  it('snake_case 컬럼을 camelCase 베이스 필드로 옮기고 변형별 id는 무시한다', () => {
    const base = mapNotificationBase({
      id: 'n1',
      type: 'comment_on_post',
      board_id: 'b1',
      post_id: 'p1',
      comment_id: 'c1',
      reply_id: null,
      actor_id: 'u1',
      message: '댓글이 달렸어요',
      created_at: '2026-01-15T09:00:00.000Z',
      read: false,
    });

    expect(base).toMatchObject({
      id: 'n1',
      boardId: 'b1',
      postId: 'p1',
      fromUserId: 'u1',
      message: '댓글이 달렸어요',
      read: false,
    });
    expect(base.timestamp.toDate().toISOString()).toBe('2026-01-15T09:00:00.000Z');
  });
});
