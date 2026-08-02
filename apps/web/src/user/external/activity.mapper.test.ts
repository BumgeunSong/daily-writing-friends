import { describe, expect, it } from 'vitest';

import { mapToCommenting, mapToPosting, mapToReplying } from './activity.mapper';

describe('mapToPosting', () => {
  const base = {
    id: 'p1',
    board_id: 'b1',
    title: '제목',
    content_length: 100,
    created_at: '2026-01-15T09:00:00Z',
  };

  it('posts_feed 행을 활동(posting) 모델로 옮긴다', () => {
    const posting = mapToPosting(base);
    expect(posting.board.id).toBe('b1');
    expect(posting.post).toEqual({ id: 'p1', title: '제목', contentLength: 100 });
    expect(posting.createdAt.toISOString()).toBe('2026-01-15T09:00:00.000Z');
  });

  it('content_length가 null이면 0, title이 null이면 빈 문자열로 낮춘다', () => {
    const posting = mapToPosting({ ...base, content_length: null, title: null });
    expect(posting.post.contentLength).toBe(0);
    expect(posting.post.title).toBe('');
  });

  it('created_at이 null이면 epoch 1970 대신 예외를 던진다', () => {
    expect(() => mapToPosting({ ...base, created_at: null })).toThrow(
      "missing required field 'created_at'",
    );
  });

  it('id가 null이면 예외를 던진다', () => {
    expect(() => mapToPosting({ ...base, id: null })).toThrow("missing required field 'id'");
  });

  it('board_id가 null이면 예외를 던진다', () => {
    expect(() => mapToPosting({ ...base, board_id: null })).toThrow(
      "missing required field 'board_id'",
    );
  });
});

describe('mapToCommenting', () => {
  const postEmbed = { id: 'p1', title: '글', author_id: 'a1', board_id: 'b1' };
  const base = { id: 'c1', content: '댓글', created_at: '2026-01-15T09:00:00Z', post_id: 'p1' };

  it('comments 행과 posts 임베드를 활동(commenting) 모델로 옮긴다', () => {
    const commenting = mapToCommenting({ ...base, posts: postEmbed });
    expect(commenting.board.id).toBe('b1');
    expect(commenting.post).toEqual({ id: 'p1', title: '글', authorId: 'a1' });
    expect(commenting.comment).toEqual({ id: 'c1', content: '댓글' });
  });

  it('posts 임베드가 배열로 와도 첫 요소를 편다', () => {
    const commenting = mapToCommenting({ ...base, posts: [postEmbed] });
    expect(commenting.post.id).toBe('p1');
  });
});

describe('mapToReplying', () => {
  const postEmbed = { id: 'p1', title: '글', author_id: 'a1', board_id: 'b1' };
  const base = {
    id: 'r1',
    created_at: '2026-01-15T09:00:00Z',
    comment_id: 'c1',
    post_id: 'p1',
    user_id: 'u1',
  };

  it('replies 행과 posts/comments 임베드를 활동(replying) 모델로 옮긴다', () => {
    const replying = mapToReplying({ ...base, posts: postEmbed, comments: { id: 'c1' } });
    expect(replying.board.id).toBe('b1');
    expect(replying.post).toEqual({ id: 'p1', title: '글', authorId: 'a1' });
    expect(replying.reply).toEqual({ id: 'r1' });
  });

  // 조인에서 댓글 작성자 컬럼이 모호해 선택하지 않으므로 authorId는 빈 문자열로 둔다.
  it('comment.authorId는 조회하지 않으므로 빈 문자열이다', () => {
    const replying = mapToReplying({ ...base, posts: postEmbed, comments: { id: 'c1' } });
    expect(replying.comment).toEqual({ id: 'c1', authorId: '' });
  });

  it('임베드가 배열로 와도 첫 요소를 편다', () => {
    const replying = mapToReplying({ ...base, posts: [postEmbed], comments: [{ id: 'c1' }] });
    expect(replying.post.id).toBe('p1');
    expect(replying.comment.id).toBe('c1');
  });
});
