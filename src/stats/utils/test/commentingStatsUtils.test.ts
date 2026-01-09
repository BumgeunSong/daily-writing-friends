import { describe, it, expect } from 'vitest';
import {
  getTotalCommentCount,
  sortCommentingStats,
} from '../commentingStatsUtils';
import type { UserCommentingStats } from '@/stats/hooks/useCommentingStats';
import type { CommentingContribution } from '@/stats/utils/commentingContributionUtils';

function createMockContribution(
  countOfCommentAndReplies: number | null,
  createdAt = '2025-01-15',
): CommentingContribution {
  return {
    createdAt,
    countOfCommentAndReplies,
  };
}

function createMockUserCommentingStats(
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
      const contributions = [
        createMockContribution(5),
        createMockContribution(3),
        createMockContribution(7),
      ];

      const result = getTotalCommentCount(contributions);

      expect(result).toBe(15);
    });

    it('should treat null counts as 0', () => {
      const contributions = [
        createMockContribution(5),
        createMockContribution(null),
        createMockContribution(3),
      ];

      const result = getTotalCommentCount(contributions);

      expect(result).toBe(8);
    });

    it('should return 0 for empty array', () => {
      const result = getTotalCommentCount([]);

      expect(result).toBe(0);
    });

    it('should return 0 when all counts are null', () => {
      const contributions = [
        createMockContribution(null),
        createMockContribution(null),
        createMockContribution(null),
      ];

      const result = getTotalCommentCount(contributions);

      expect(result).toBe(0);
    });

    it('should handle single contribution', () => {
      const contributions = [createMockContribution(10)];

      const result = getTotalCommentCount(contributions);

      expect(result).toBe(10);
    });

    it('should handle contribution with zero count', () => {
      const contributions = [
        createMockContribution(5),
        createMockContribution(0),
        createMockContribution(3),
      ];

      const result = getTotalCommentCount(contributions);

      expect(result).toBe(8);
    });
  });

  describe('sortCommentingStats', () => {
    it('should place current user first', () => {
      const stats = [
        createMockUserCommentingStats('user1', [createMockContribution(50)]),
        createMockUserCommentingStats('user2', [createMockContribution(10)]),
        createMockUserCommentingStats('user3', [createMockContribution(30)]),
      ];

      const result = sortCommentingStats(stats, 'user2');

      expect(result[0].user.id).toBe('user2');
    });

    it('should sort by total comment count descending after current user', () => {
      const stats = [
        createMockUserCommentingStats('user1', [createMockContribution(10)]),
        createMockUserCommentingStats('user2', [createMockContribution(50)]),
        createMockUserCommentingStats('user3', [createMockContribution(30)]),
      ];

      const result = sortCommentingStats(stats, 'user1');

      expect(result[0].user.id).toBe('user1'); // Current user first
      expect(result[1].user.id).toBe('user2'); // 50 comments
      expect(result[2].user.id).toBe('user3'); // 30 comments
    });

    it('should sort by total comment count when no current user', () => {
      const stats = [
        createMockUserCommentingStats('user1', [createMockContribution(10)]),
        createMockUserCommentingStats('user2', [createMockContribution(50)]),
        createMockUserCommentingStats('user3', [createMockContribution(30)]),
      ];

      const result = sortCommentingStats(stats);

      expect(result[0].user.id).toBe('user2'); // 50
      expect(result[1].user.id).toBe('user3'); // 30
      expect(result[2].user.id).toBe('user1'); // 10
    });

    it('should handle empty array', () => {
      const result = sortCommentingStats([]);

      expect(result).toEqual([]);
    });

    it('should sum multiple contributions per user', () => {
      const stats = [
        createMockUserCommentingStats('user1', [
          createMockContribution(10),
          createMockContribution(10),
        ]),
        createMockUserCommentingStats('user2', [createMockContribution(15)]),
      ];

      const result = sortCommentingStats(stats);

      expect(result[0].user.id).toBe('user1'); // 20 total
      expect(result[1].user.id).toBe('user2'); // 15 total
    });

    it('should handle null counts in sorting', () => {
      const stats = [
        createMockUserCommentingStats('user1', [createMockContribution(null)]),
        createMockUserCommentingStats('user2', [createMockContribution(10)]),
        createMockUserCommentingStats('user3', [createMockContribution(null)]),
      ];

      const result = sortCommentingStats(stats);

      expect(result[0].user.id).toBe('user2'); // 10 comments
    });

    it('should not mutate original array', () => {
      const stats = [
        createMockUserCommentingStats('user1', [createMockContribution(10)]),
        createMockUserCommentingStats('user2', [createMockContribution(50)]),
      ];
      const originalFirst = stats[0].user.id;

      sortCommentingStats(stats);

      expect(stats[0].user.id).toBe(originalFirst);
    });

    it('should handle current user not in list', () => {
      const stats = [
        createMockUserCommentingStats('user1', [createMockContribution(30)]),
        createMockUserCommentingStats('user2', [createMockContribution(10)]),
      ];

      const result = sortCommentingStats(stats, 'user99');

      expect(result[0].user.id).toBe('user1'); // 30
      expect(result[1].user.id).toBe('user2'); // 10
    });

    it('should handle single user', () => {
      const stats = [createMockUserCommentingStats('user1', [createMockContribution(10)])];

      const result = sortCommentingStats(stats, 'user1');

      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe('user1');
    });

    it('should handle users with equal comment counts', () => {
      const stats = [
        createMockUserCommentingStats('user1', [createMockContribution(20)]),
        createMockUserCommentingStats('user2', [createMockContribution(20)]),
        createMockUserCommentingStats('user3', [createMockContribution(20)]),
      ];

      const result = sortCommentingStats(stats);

      expect(result).toHaveLength(3);
      expect(result.every((s) => getTotalCommentCount(s.contributions) === 20)).toBe(true);
    });
  });
});
