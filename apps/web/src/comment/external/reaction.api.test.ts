import { describe, expect, it } from 'vitest';

import { groupReactionsByComment, mapToReaction } from './reaction.api';

describe('리액션 로우를 도메인 모델로 매핑할 때', () => {
  it('반응 타입과 반응 유저를 옮기고 널 프로필 이미지는 빈 문자열로 접는다', () => {
    const reaction = mapToReaction({
      id: 'x1',
      reaction_type: '👍',
      user_id: 'u1',
      user_name: '유저',
      user_profile_image: null,
      created_at: '2026-01-01T00:00:00.000Z',
    });

    expect(reaction).toMatchObject({
      id: 'x1',
      content: '👍',
      reactionUser: { userId: 'u1', userName: '유저', userProfileImage: '' },
    });
    expect(reaction.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('배치 리액션을 댓글별로 묶을 때', () => {
  it('요청한 댓글 id마다 빈 배열을 심고 각 로우를 해당 댓글에 넣는다', () => {
    const grouped = groupReactionsByComment(
      ['c1', 'c2'],
      [
        { comment_id: 'c1', id: 'x1', reaction_type: '👍', user_id: 'u1', user_name: 'A', user_profile_image: null, created_at: '2026-01-01T00:00:00.000Z' },
        { comment_id: 'c1', id: 'x2', reaction_type: '❤️', user_id: 'u2', user_name: 'B', user_profile_image: null, created_at: '2026-01-01T00:00:00.000Z' },
      ],
    );

    expect(grouped.get('c1')).toHaveLength(2);
    expect(grouped.get('c1')?.[0].id).toBe('x1');
    expect(grouped.get('c2')).toEqual([]);
  });

  it('comment_id가 널인 로우(답글 리액션)와 요청 밖 댓글 로우는 건너뛴다', () => {
    const grouped = groupReactionsByComment(
      ['c1'],
      [
        { comment_id: null, id: 'x1', reaction_type: '👍', user_id: 'u1', user_name: 'A', user_profile_image: null, created_at: '2026-01-01T00:00:00.000Z' },
        { comment_id: 'c9', id: 'x2', reaction_type: '👍', user_id: 'u2', user_name: 'B', user_profile_image: null, created_at: '2026-01-01T00:00:00.000Z' },
      ],
    );

    expect(grouped.get('c1')).toEqual([]);
    expect(grouped.has('c9')).toBe(false);
  });
});
