import { describe, it, expect } from 'vitest';
import { mergeCurrentUserFirst } from '../mergeStatsUtils';
import type { UserCommentingStats } from '@/stats/hooks/useCommentingStats';
import type { CommentingContribution } from '@/stats/utils/commentingContributionUtils';

function createMockContribution(
  countOfCommentAndReplies: number | null,
  createdAt = '2025-01-15'
): CommentingContribution {
  return {
    createdAt,
    countOfCommentAndReplies,
  };
}

function createMockUserCommentingStats(
  userId: string,
  contributions: CommentingContribution[]
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

describe('mergeCurrentUserFirst', () => {
  describe('with UserCommentingStats', () => {
    it('should place current user stats first in the list', () => {
      const currentUserStats = createMockUserCommentingStats('current-user', [
        createMockContribution(5),
      ]);
      const otherUsersStats = [
        createMockUserCommentingStats('user1', [createMockContribution(10)]),
        createMockUserCommentingStats('user2', [createMockContribution(20)]),
      ];

      const result = mergeCurrentUserFirst(currentUserStats, otherUsersStats);

      expect(result).toHaveLength(3);
      expect(result![0].user.id).toBe('current-user');
      expect(result![1].user.id).toBe('user1');
      expect(result![2].user.id).toBe('user2');
    });

    it('should return only other users when current user stats is undefined', () => {
      const otherUsersStats = [
        createMockUserCommentingStats('user1', [createMockContribution(10)]),
        createMockUserCommentingStats('user2', [createMockContribution(20)]),
      ];

      const result = mergeCurrentUserFirst(undefined, otherUsersStats);

      expect(result).toHaveLength(2);
      expect(result![0].user.id).toBe('user1');
    });

    it('should return undefined when other users stats is undefined', () => {
      const currentUserStats = createMockUserCommentingStats('current-user', [
        createMockContribution(5),
      ]);

      const result = mergeCurrentUserFirst(currentUserStats, undefined);

      expect(result).toBeUndefined();
    });

    it('should return undefined when both are undefined', () => {
      const result = mergeCurrentUserFirst<UserCommentingStats>(undefined, undefined);

      expect(result).toBeUndefined();
    });

    it('should handle empty other users array', () => {
      const currentUserStats = createMockUserCommentingStats('current-user', [
        createMockContribution(5),
      ]);

      const result = mergeCurrentUserFirst(currentUserStats, []);

      expect(result).toHaveLength(1);
      expect(result![0].user.id).toBe('current-user');
    });

    it('should not mutate original arrays', () => {
      const currentUserStats = createMockUserCommentingStats('current-user', [
        createMockContribution(5),
      ]);
      const otherUsersStats = [
        createMockUserCommentingStats('user1', [createMockContribution(10)]),
      ];
      const originalLength = otherUsersStats.length;

      mergeCurrentUserFirst(currentUserStats, otherUsersStats);

      expect(otherUsersStats.length).toBe(originalLength);
    });
  });
});
