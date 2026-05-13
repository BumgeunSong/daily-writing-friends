import { describe, expect, it } from 'vitest';
import type { Post } from '@/post/model/Post';
import { deriveSearchState } from '../deriveSearchState';

const noData = { isFetching: false, isError: false } as const;
const stubPost = { id: 'p1' } as unknown as Post;

describe('deriveSearchState', () => {
  describe('terminal states', () => {
    it('returns idle when query is too short', () => {
      expect(deriveSearchState('', noData)).toBe('idle');
      expect(deriveSearchState('a', noData)).toBe('idle');
    });

    it('returns loading when fetching with no prior data', () => {
      expect(
        deriveSearchState('hi', { isFetching: true, isError: false, data: undefined }),
      ).toBe('loading');
    });

    it('returns empty when fetch resolves to zero posts', () => {
      expect(
        deriveSearchState('hi', { isFetching: false, isError: false, data: [] }),
      ).toBe('empty');
    });

    it('returns results when at least one post matches', () => {
      expect(
        deriveSearchState('hi', { isFetching: false, isError: false, data: [stubPost] }),
      ).toBe('results');
    });

    it('returns error when query has errored', () => {
      expect(
        deriveSearchState('hi', { isFetching: false, isError: true, data: undefined }),
      ).toBe('error');
    });
  });

  describe('evaluation order', () => {
    it('idle gate wins over a previously-cached result (keepPreviousData regression)', () => {
      // The user just cleared the input; React Query still holds `data` from the prior query.
      // The view must show the idle prompt, not stale cards.
      expect(
        deriveSearchState('', { isFetching: false, isError: false, data: [stubPost] }),
      ).toBe('idle');
    });

    it('error wins over a concurrent fetch', () => {
      expect(
        deriveSearchState('hi', { isFetching: true, isError: true, data: undefined }),
      ).toBe('error');
    });

    it('keepPreviousData mid-typing keeps results visible instead of flashing loading', () => {
      // A new request is in flight, but `keepPreviousData` is still exposing the previous data.
      expect(
        deriveSearchState('hi', { isFetching: true, isError: false, data: [stubPost] }),
      ).toBe('results');
    });
  });
});
