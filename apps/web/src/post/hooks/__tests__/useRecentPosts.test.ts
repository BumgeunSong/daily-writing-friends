import { describe, it, expect } from 'vitest';
import type { Post } from '@/post/model/Post';
import {
  buildRecentPostsQueryKey,
  getRecentPostsNextPageParam,
} from '../useRecentPosts';

function makePost(createdAtIso: string, overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    boardId: 'b1',
    title: 'T',
    content: '',
    thumbnailImageURL: null,
    authorId: 'u1',
    authorName: '',
    createdAt: { toDate: () => new Date(createdAtIso) } as Post['createdAt'],
    countOfComments: 0,
    countOfReplies: 0,
    countOfLikes: 0,
    visibility: 'public' as Post['visibility'],
    ...overrides,
  };
}

describe('buildRecentPostsQueryKey', () => {
  it('returns ["posts", boardId, blockedByUsers] in that exact shape', () => {
    expect(buildRecentPostsQueryKey('b1', ['u1', 'u2'])).toEqual(['posts', 'b1', ['u1', 'u2']]);
  });

  it('keeps the ["posts", boardId] prefix so invalidatePostCaches matches partially', () => {
    // invalidatePostCaches uses ['posts', boardId] for partial invalidation.
    // If this shape changes, that invalidation silently no-ops.
    const key = buildRecentPostsQueryKey('b1', []);
    expect(key[0]).toBe('posts');
    expect(key[1]).toBe('b1');
  });

  it('encodes blockedByUsers as the third segment so cache splits per block-list', () => {
    const a = buildRecentPostsQueryKey('b1', ['u1']);
    const b = buildRecentPostsQueryKey('b1', ['u2']);
    expect(a).not.toEqual(b);
  });
});

describe('getRecentPostsNextPageParam', () => {
  it('returns the last post’s createdAt as a Date', () => {
    const page = [makePost('2025-01-01T00:00:00Z'), makePost('2025-01-02T00:00:00Z')];
    const result = getRecentPostsNextPageParam(page);
    expect(result).toEqual(new Date('2025-01-02T00:00:00Z'));
  });

  it('returns undefined for an empty page (signals end-of-list)', () => {
    expect(getRecentPostsNextPageParam([])).toBeUndefined();
  });

  it('uses the LAST post in the page, not the first', () => {
    const page = [makePost('2025-01-01T00:00:00Z'), makePost('2025-01-05T00:00:00Z')];
    expect(getRecentPostsNextPageParam(page)).toEqual(new Date('2025-01-05T00:00:00Z'));
  });
});
