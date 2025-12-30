import { describe, it, expect } from 'vitest';
import {
  getTotalContentLength,
  sortWritingStats,
} from '../writingStatsUtils';
import type { WritingStats, Contribution } from '@/stats/model/WritingStats';

function createMockWritingStats(
  userId: string,
  contributions: Contribution[],
): WritingStats {
  return {
    user: {
      id: userId,
      nickname: `User ${userId}`,
      realname: null,
      profilePhotoURL: null,
      bio: null,
    },
    contributions,
    badges: [],
    recentStreak: 0,
  };
}

describe('writingStatsUtils', () => {
  describe('getTotalContentLength', () => {
    it('should sum all content lengths', () => {
      const contributions: Contribution[] = [
        { createdAt: '2025-01-01', contentLength: 100 },
        { createdAt: '2025-01-02', contentLength: 200 },
        { createdAt: '2025-01-03', contentLength: 150 },
      ];

      const result = getTotalContentLength(contributions);

      expect(result).toBe(450);
    });

    it('should treat null contentLength as 0', () => {
      const contributions: Contribution[] = [
        { createdAt: '2025-01-01', contentLength: 100 },
        { createdAt: '2025-01-02', contentLength: null },
        { createdAt: '2025-01-03', contentLength: 200 },
      ];

      const result = getTotalContentLength(contributions);

      expect(result).toBe(300);
    });

    it('should return 0 for empty array', () => {
      const result = getTotalContentLength([]);

      expect(result).toBe(0);
    });

    it('should return 0 when all contentLengths are null', () => {
      const contributions: Contribution[] = [
        { createdAt: '2025-01-01', contentLength: null },
        { createdAt: '2025-01-02', contentLength: null },
      ];

      const result = getTotalContentLength(contributions);

      expect(result).toBe(0);
    });
  });

  describe('sortWritingStats', () => {
    it('should place current user first', () => {
      const stats = [
        createMockWritingStats('user1', [{ createdAt: '2025-01-01', contentLength: 500 }]),
        createMockWritingStats('user2', [{ createdAt: '2025-01-01', contentLength: 100 }]),
        createMockWritingStats('user3', [{ createdAt: '2025-01-01', contentLength: 300 }]),
      ];

      const result = sortWritingStats(stats, 'user2');

      expect(result[0].user.id).toBe('user2');
    });

    it('should sort by total content length descending after current user', () => {
      const stats = [
        createMockWritingStats('user1', [{ createdAt: '2025-01-01', contentLength: 100 }]),
        createMockWritingStats('user2', [{ createdAt: '2025-01-01', contentLength: 500 }]),
        createMockWritingStats('user3', [{ createdAt: '2025-01-01', contentLength: 300 }]),
      ];

      const result = sortWritingStats(stats, 'user1');

      expect(result[0].user.id).toBe('user1'); // Current user first
      expect(result[1].user.id).toBe('user2'); // 500 content length
      expect(result[2].user.id).toBe('user3'); // 300 content length
    });

    it('should sort by total content length when no current user', () => {
      const stats = [
        createMockWritingStats('user1', [{ createdAt: '2025-01-01', contentLength: 100 }]),
        createMockWritingStats('user2', [{ createdAt: '2025-01-01', contentLength: 500 }]),
        createMockWritingStats('user3', [{ createdAt: '2025-01-01', contentLength: 300 }]),
      ];

      const result = sortWritingStats(stats);

      expect(result[0].user.id).toBe('user2'); // 500
      expect(result[1].user.id).toBe('user3'); // 300
      expect(result[2].user.id).toBe('user1'); // 100
    });

    it('should handle empty array', () => {
      const result = sortWritingStats([]);

      expect(result).toEqual([]);
    });

    it('should sum multiple contributions per user', () => {
      const stats = [
        createMockWritingStats('user1', [
          { createdAt: '2025-01-01', contentLength: 100 },
          { createdAt: '2025-01-02', contentLength: 100 },
        ]),
        createMockWritingStats('user2', [
          { createdAt: '2025-01-01', contentLength: 150 },
        ]),
      ];

      const result = sortWritingStats(stats);

      expect(result[0].user.id).toBe('user1'); // 200 total
      expect(result[1].user.id).toBe('user2'); // 150 total
    });

    it('should not mutate original array', () => {
      const stats = [
        createMockWritingStats('user1', [{ createdAt: '2025-01-01', contentLength: 100 }]),
        createMockWritingStats('user2', [{ createdAt: '2025-01-01', contentLength: 500 }]),
      ];
      const originalFirst = stats[0].user.id;

      sortWritingStats(stats);

      expect(stats[0].user.id).toBe(originalFirst);
    });
  });
});
