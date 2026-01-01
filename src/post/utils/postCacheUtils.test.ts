import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

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
import { optimisticallyUpdatePostingStreak } from './postCacheUtils';

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
