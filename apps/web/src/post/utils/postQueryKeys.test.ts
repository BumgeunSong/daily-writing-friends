import { describe, it, expect } from 'vitest';
import { postQueryKey, userQueryKey } from './postQueryKeys';

describe('postQueryKey', () => {
  it('returns the canonical [post, boardId, postId] tuple', () => {
    expect(postQueryKey('b1', 'p1')).toEqual(['post', 'b1', 'p1']);
  });

  it('preserves argument order so readers and writers hit the same cache slot', () => {
    expect(postQueryKey('boardA', 'postZ')).toEqual(['post', 'boardA', 'postZ']);
    expect(postQueryKey('boardA', 'postZ')).not.toEqual(['post', 'postZ', 'boardA']);
  });
});

describe('userQueryKey', () => {
  it('returns the canonical [user, uid] tuple', () => {
    expect(userQueryKey('u1')).toEqual(['user', 'u1']);
  });
});
