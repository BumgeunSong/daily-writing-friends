import { describe, it, expect } from 'vitest';
import type { Post } from '@/post/model/Post';
import {
  buildBestPostsQueryKey,
  getBestPostsNextPageParam,
  shouldFetchMoreBestPosts,
  BEST_POSTS_PAGE_SIZE,
  BEST_POSTS_MAX_PAGES,
} from './useBestPosts';

function makePost(engagementScore: number, overrides: Partial<Post> = {}): Post {
  return {
    id: 'p1',
    boardId: 'b1',
    title: 'T',
    content: '',
    thumbnailImageURL: null,
    authorId: 'u1',
    authorName: '',
    createdAt: { toDate: () => new Date('2025-01-01') } as Post['createdAt'],
    countOfComments: 0,
    countOfReplies: 0,
    countOfLikes: 0,
    visibility: 'public' as Post['visibility'],
    engagementScore,
    ...overrides,
  };
}

const fullPage = (score: number) =>
  Array.from({ length: BEST_POSTS_PAGE_SIZE }, () => makePost(score));

describe('buildBestPostsQueryKey', () => {
  it('returns ["bestPosts", boardId, blockedByUsers]', () => {
    expect(buildBestPostsQueryKey('b1', ['u1'])).toEqual(['bestPosts', 'b1', ['u1']]);
  });

  it('keeps the ["bestPosts", boardId] prefix so invalidation matches partially', () => {
    const key = buildBestPostsQueryKey('b1', []);
    expect(key[0]).toBe('bestPosts');
    expect(key[1]).toBe('b1');
  });

  it('encodes blockedByUsers=undefined distinctly from an empty array', () => {
    const a = buildBestPostsQueryKey('b1', undefined);
    const b = buildBestPostsQueryKey('b1', []);
    expect(a[2]).toBeUndefined();
    expect(b[2]).toEqual([]);
  });
});

describe('getBestPostsNextPageParam', () => {
  describe('stop conditions', () => {
    it('returns undefined when the last page is empty', () => {
      expect(getBestPostsNextPageParam([], [[]])).toBeUndefined();
    });

    it('returns undefined when the last page is partial (server exhausted)', () => {
      const partial = [makePost(50), makePost(40)];
      expect(getBestPostsNextPageParam(partial, [partial])).toBeUndefined();
    });

    it('returns undefined when maxPages is reached even with a full last page', () => {
      const allFullPages = Array.from({ length: BEST_POSTS_MAX_PAGES }, () => fullPage(50));
      const last = allFullPages[allFullPages.length - 1];
      expect(getBestPostsNextPageParam(last, allFullPages)).toBeUndefined();
    });
  });

  describe('continue conditions', () => {
    it('returns the last post’s engagementScore for a full page under the maxPages cap', () => {
      const page = [...fullPage(80).slice(0, 19), makePost(42)];
      expect(getBestPostsNextPageParam(page, [page])).toBe(42);
    });

    it('returns the last post’s engagementScore on the (maxPages-1)th page', () => {
      const allPagesMinusOne = Array.from(
        { length: BEST_POSTS_MAX_PAGES - 1 },
        () => fullPage(50),
      );
      const last = allPagesMinusOne[allPagesMinusOne.length - 1];
      expect(getBestPostsNextPageParam(last, allPagesMinusOne)).toBe(50);
    });
  });

  describe('config override', () => {
    it('honors a custom pageSize when judging partial vs full', () => {
      const page = [makePost(10), makePost(5)];
      const result = getBestPostsNextPageParam(page, [page], { pageSize: 2, maxPages: 10 });
      expect(result).toBe(5);
    });

    it('honors a custom maxPages cap', () => {
      const pages = [fullPage(50), fullPage(50)];
      const result = getBestPostsNextPageParam(pages[1], pages, {
        pageSize: BEST_POSTS_PAGE_SIZE,
        maxPages: 2,
      });
      expect(result).toBeUndefined();
    });
  });
});

describe('shouldFetchMoreBestPosts', () => {
  it('returns true when below target, hasNextPage, and no fetch in flight', () => {
    expect(
      shouldFetchMoreBestPosts({
        currentCount: 3,
        targetCount: 5,
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
    ).toBe(true);
  });

  it('returns false when already at the target count', () => {
    expect(
      shouldFetchMoreBestPosts({
        currentCount: 5,
        targetCount: 5,
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
    ).toBe(false);
  });

  it('returns false when hasNextPage is false', () => {
    expect(
      shouldFetchMoreBestPosts({
        currentCount: 3,
        targetCount: 5,
        hasNextPage: false,
        isFetchingNextPage: false,
      }),
    ).toBe(false);
  });

  it('returns false when hasNextPage is undefined (TanStack initial state)', () => {
    expect(
      shouldFetchMoreBestPosts({
        currentCount: 3,
        targetCount: 5,
        hasNextPage: undefined,
        isFetchingNextPage: false,
      }),
    ).toBe(false);
  });

  it('returns false when a fetch is already in flight', () => {
    expect(
      shouldFetchMoreBestPosts({
        currentCount: 3,
        targetCount: 5,
        hasNextPage: true,
        isFetchingNextPage: true,
      }),
    ).toBe(false);
  });
});
