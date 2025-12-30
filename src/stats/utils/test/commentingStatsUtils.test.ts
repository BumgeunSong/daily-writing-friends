import { describe, it, expect } from 'vitest';
import {
  getTotalCommentCount,
  sortCommentingStats,
} from '../commentingStatsUtils';
import type { UserCommentingStats } from '@/stats/hooks/useCommentingStats';
import type { CommentingContribution } from '@/stats/utils/commentingContributionUtils';

function createMockCommentingStats(
  userId: string,
  contributions: CommentingContribution[],
): UserCommentingStats {
  return {
    user: {
      id: userId,
      nickname: `User ${userId}`,
      realname: null,
      profilePhotoURL: null,
      bio: null,
    },
    contributions,
  };
}

describe('commentingStatsUtils', () => {
  describe('getTotalCommentCount', () => {
    it('should sum all comment counts', () => {
      const contributions: CommentingContribution[] = [
        { createdAt: '2025-01-01', countOfCommentAndReplies: 5 },
        { createdAt: '2025-01-02', countOfCommentAndReplies: 3 },
        { createdAt: '2025-01-03', countOfCommentAndReplies: 7 },
      ];

      const result = getTotalCommentCount(contributions);

      expect(result).toBe(15);
    });

    it('should treat null counts as 0', () => {
      const contributions: CommentingContribution[] = [
        { createdAt: '2025-01-01', countOfCommentAndReplies: 5 },
        { createdAt: '2025-01-02', countOfCommentAndReplies: null },
        { createdAt: '2025-01-03', countOfCommentAndReplies: 3 },
      ];

      const result = getTotalCommentCount(contributions);

      expect(result).toBe(8);
    });

    it('should return 0 for empty array', () => {
      const result = getTotalCommentCount([]);

      expect(result).toBe(0);
    });

    it('should return 0 when all counts are null', () => {
      const contributions: CommentingContribution[] = [
        { createdAt: '2025-01-01', countOfCommentAndReplies: null },
        { createdAt: '2025-01-02', countOfCommentAndReplies: null },
      ];

      const result = getTotalCommentCount(contributions);

      expect(result).toBe(0);
    });
  });

  describe('sortCommentingStats', () => {
    it('should place current user first', () => {
      const stats = [
        createMockCommentingStats('user1', [{ createdAt: '2025-01-01', countOfCommentAndReplies: 20 }]),
        createMockCommentingStats('user2', [{ createdAt: '2025-01-01', countOfCommentAndReplies: 5 }]),
        createMockCommentingStats('user3', [{ createdAt: '2025-01-01', countOfCommentAndReplies: 10 }]),
      ];

      const result = sortCommentingStats(stats, 'user2');

      expect(result[0].user.id).toBe('user2');
    });

    it('should sort by total comment count descending after current user', () => {
      const stats = [
        createMockCommentingStats('user1', [{ createdAt: '2025-01-01', countOfCommentAndReplies: 5 }]),
        createMockCommentingStats('user2', [{ createdAt: '2025-01-01', countOfCommentAndReplies: 20 }]),
        createMockCommentingStats('user3', [{ createdAt: '2025-01-01', countOfCommentAndReplies: 10 }]),
      ];

      const result = sortCommentingStats(stats, 'user1');

      expect(result[0].user.id).toBe('user1'); // Current user first
      expect(result[1].user.id).toBe('user2'); // 20 comments
      expect(result[2].user.id).toBe('user3'); // 10 comments
    });

    it('should sort by total comment count when no current user', () => {
      const stats = [
        createMockCommentingStats('user1', [{ createdAt: '2025-01-01', countOfCommentAndReplies: 5 }]),
        createMockCommentingStats('user2', [{ createdAt: '2025-01-01', countOfCommentAndReplies: 20 }]),
        createMockCommentingStats('user3', [{ createdAt: '2025-01-01', countOfCommentAndReplies: 10 }]),
      ];

      const result = sortCommentingStats(stats);

      expect(result[0].user.id).toBe('user2'); // 20
      expect(result[1].user.id).toBe('user3'); // 10
      expect(result[2].user.id).toBe('user1'); // 5
    });

    it('should handle empty array', () => {
      const result = sortCommentingStats([]);

      expect(result).toEqual([]);
    });

    it('should sum multiple contributions per user', () => {
      const stats = [
        createMockCommentingStats('user1', [
          { createdAt: '2025-01-01', countOfCommentAndReplies: 5 },
          { createdAt: '2025-01-02', countOfCommentAndReplies: 5 },
        ]),
        createMockCommentingStats('user2', [
          { createdAt: '2025-01-01', countOfCommentAndReplies: 8 },
        ]),
      ];

      const result = sortCommentingStats(stats);

      expect(result[0].user.id).toBe('user1'); // 10 total
      expect(result[1].user.id).toBe('user2'); // 8 total
    });

    it('should not mutate original array', () => {
      const stats = [
        createMockCommentingStats('user1', [{ createdAt: '2025-01-01', countOfCommentAndReplies: 5 }]),
        createMockCommentingStats('user2', [{ createdAt: '2025-01-01', countOfCommentAndReplies: 20 }]),
      ];
      const originalFirst = stats[0].user.id;

      sortCommentingStats(stats);

      expect(stats[0].user.id).toBe(originalFirst);
    });
  });
});
