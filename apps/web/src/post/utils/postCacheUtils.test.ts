import { QueryClient } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Post } from '@/post/model/Post';
import { PostVisibility } from '@/post/model/Post';
import { createTimestamp } from '@/shared/model/Timestamp';

// Create a real QueryClient for testing behavior
let queryClient: QueryClient;

// Mock the module to use our test QueryClient
vi.mock('@/shared/lib/queryClient', () => ({
  get queryClient() {
    return queryClient;
  },
}));

// Mock isWorkingDay to control whether today is a working day
const mockIsWorkingDay = vi.fn();
vi.mock('@/shared/utils/dateUtils', () => ({
  isWorkingDay: (...args: unknown[]) => mockIsWorkingDay(...args),
}));

// Import after mocking
import { optimisticallyUpdatePostingStreak, seedPostCache } from './postCacheUtils';

const makePost = (over: Partial<Post> = {}): Post => ({
  id: 'p1',
  boardId: 'b1',
  title: 't',
  content: 'c',
  thumbnailImageURL: null,
  authorId: 'a1',
  authorName: 'A',
  countOfComments: 0,
  countOfReplies: 0,
  countOfLikes: 0,
  createdAt: createTimestamp(new Date('2026-01-01T00:00:00Z')),
  visibility: PostVisibility.PUBLIC,
  ...over,
});

describe('seedPostCache', () => {
  it('writes the post under [post, boardId, postId] so PostDetailPage useQuery hits cache', () => {
    const qc = new QueryClient();
    const post = makePost({ id: 'p1', boardId: 'b1' });
    seedPostCache(qc, post);
    expect(qc.getQueryData(['post', 'b1', 'p1'])).toEqual(post);
  });

  it('does NOT overwrite an existing cache entry (avoid regressing fresher detail-page data)', () => {
    const qc = new QueryClient();
    const fresher = makePost({ id: 'p1', boardId: 'b1', title: 'fresher-detail-data' });
    qc.setQueryData(['post', 'b1', 'p1'], fresher);
    seedPostCache(qc, makePost({ id: 'p1', boardId: 'b1', title: 'older-list-data' }));
    expect((qc.getQueryData(['post', 'b1', 'p1']) as Post).title).toBe('fresher-detail-data');
  });
});

describe('optimisticallyUpdatePostingStreak', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    // Default to working day for most tests
    mockIsWorkingDay.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when streak cache exists', () => {
    it('sets today (last element) to true', () => {
      const authorId = 'user-123';
      const initialStreak = [true, false, true, false, false];
      queryClient.setQueryData(['postingStreak', authorId], { streak: initialStreak });

      optimisticallyUpdatePostingStreak(authorId);

      const updatedData = queryClient.getQueryData<{ streak: boolean[] }>(['postingStreak', authorId]);
      expect(updatedData?.streak).toEqual([true, false, true, false, true]);
    });

    it('preserves other days in the streak', () => {
      const authorId = 'user-456';
      const initialStreak = [false, false, false, false, false];
      queryClient.setQueryData(['postingStreak', authorId], { streak: initialStreak });

      optimisticallyUpdatePostingStreak(authorId);

      const updatedData = queryClient.getQueryData<{ streak: boolean[] }>(['postingStreak', authorId]);
      expect(updatedData?.streak.slice(0, 4)).toEqual([false, false, false, false]);
    });

    it('handles already-true today value', () => {
      const authorId = 'user-789';
      const initialStreak = [true, true, true, true, true];
      queryClient.setQueryData(['postingStreak', authorId], { streak: initialStreak });

      optimisticallyUpdatePostingStreak(authorId);

      const updatedData = queryClient.getQueryData<{ streak: boolean[] }>(['postingStreak', authorId]);
      expect(updatedData?.streak).toEqual([true, true, true, true, true]);
    });

    it('does not modify cache when streak array is empty', () => {
      const authorId = 'empty-streak-user';
      const emptyStreak: boolean[] = [];
      queryClient.setQueryData(['postingStreak', authorId], { streak: emptyStreak });

      optimisticallyUpdatePostingStreak(authorId);

      const updatedData = queryClient.getQueryData<{ streak: boolean[] }>(['postingStreak', authorId]);
      expect(updatedData?.streak).toEqual([]);
    });
  });

  describe('when streak cache does not exist', () => {
    it('invalidates the query for fresh fetch on next visit', () => {
      const authorId = 'new-user';
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      optimisticallyUpdatePostingStreak(authorId);

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['postingStreak', authorId] });
    });
  });

  describe('when today is not a working day (weekend or holiday)', () => {
    it('does not modify the streak cache', () => {
      mockIsWorkingDay.mockReturnValue(false);
      const authorId = 'weekend-user';
      const initialStreak = [true, false, true, false, false];
      queryClient.setQueryData(['postingStreak', authorId], { streak: initialStreak });

      optimisticallyUpdatePostingStreak(authorId);

      const updatedData = queryClient.getQueryData<{ streak: boolean[] }>(['postingStreak', authorId]);
      expect(updatedData?.streak).toEqual([true, false, true, false, false]);
    });

    it('does not call invalidateQueries when cache does not exist', () => {
      mockIsWorkingDay.mockReturnValue(false);
      const authorId = 'weekend-new-user';
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      optimisticallyUpdatePostingStreak(authorId);

      expect(invalidateSpy).not.toHaveBeenCalled();
    });
  });
});
