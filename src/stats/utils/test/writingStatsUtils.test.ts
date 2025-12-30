import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  accumulatePostingLengths,
  toContribution,
  createContributions,
  getTotalContentLength,
  sortWritingStats,
} from '../writingStatsUtils';
import type { WritingStats, Contribution } from '@/stats/model/WritingStats';
import type { Posting } from '@/post/model/Posting';

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

function createMockPosting(dateStr: string, contentLength: number): Posting {
  // Parse date string (YYYY-MM-DD) and create a Date at noon UTC
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return {
    board: { id: 'board1' },
    post: { id: `post-${dateStr}`, title: 'Test Post', contentLength },
    createdAt: Timestamp.fromDate(date),
  };
}

describe('writingStatsUtils', () => {
  describe('accumulatePostingLengths', () => {
    it('should accumulate content lengths by date', () => {
      const postings = [
        createMockPosting('2025-01-01', 100),
        createMockPosting('2025-01-02', 200),
        createMockPosting('2025-01-03', 150),
      ];

      const result = accumulatePostingLengths(postings);

      expect(result.get('2025-01-01')).toBe(100);
      expect(result.get('2025-01-02')).toBe(200);
      expect(result.get('2025-01-03')).toBe(150);
    });

    it('should sum multiple postings on the same date', () => {
      const postings = [
        createMockPosting('2025-01-01', 100),
        createMockPosting('2025-01-01', 200),
        createMockPosting('2025-01-01', 50),
      ];

      const result = accumulatePostingLengths(postings);

      expect(result.get('2025-01-01')).toBe(350);
    });

    it('should return empty map for empty array', () => {
      const result = accumulatePostingLengths([]);

      expect(result.size).toBe(0);
    });

    it('should handle mixed dates with some duplicates', () => {
      const postings = [
        createMockPosting('2025-01-01', 100),
        createMockPosting('2025-01-02', 200),
        createMockPosting('2025-01-01', 150), // duplicate date
      ];

      const result = accumulatePostingLengths(postings);

      expect(result.get('2025-01-01')).toBe(250);
      expect(result.get('2025-01-02')).toBe(200);
      expect(result.size).toBe(2);
    });
  });

  describe('toContribution', () => {
    it('should create contribution with content length from map', () => {
      const lengthMap = new Map([
        ['2025-01-01', 100],
        ['2025-01-02', 200],
      ]);

      const result = toContribution('2025-01-01', lengthMap);

      expect(result).toEqual({ createdAt: '2025-01-01', contentLength: 100 });
    });

    it('should return null contentLength when date not in map', () => {
      const lengthMap = new Map([['2025-01-01', 100]]);

      const result = toContribution('2025-01-02', lengthMap);

      expect(result).toEqual({ createdAt: '2025-01-02', contentLength: null });
    });

    it('should handle empty map', () => {
      const lengthMap = new Map<string, number>();

      const result = toContribution('2025-01-01', lengthMap);

      expect(result).toEqual({ createdAt: '2025-01-01', contentLength: null });
    });
  });

  describe('createContributions', () => {
    it('should create contributions for all working days', () => {
      const postings = [
        createMockPosting('2025-01-01', 100),
        createMockPosting('2025-01-03', 200),
      ];
      const workingDays = [
        new Date('2025-01-01'),
        new Date('2025-01-02'),
        new Date('2025-01-03'),
      ];

      const result = createContributions(postings, workingDays);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ createdAt: '2025-01-01', contentLength: 100 });
      expect(result[1]).toEqual({ createdAt: '2025-01-02', contentLength: null });
      expect(result[2]).toEqual({ createdAt: '2025-01-03', contentLength: 200 });
    });

    it('should handle empty postings', () => {
      const workingDays = [new Date('2025-01-01'), new Date('2025-01-02')];

      const result = createContributions([], workingDays);

      expect(result).toHaveLength(2);
      expect(result[0].contentLength).toBeNull();
      expect(result[1].contentLength).toBeNull();
    });

    it('should handle empty working days', () => {
      const postings = [createMockPosting('2025-01-01', 100)];

      const result = createContributions(postings, []);

      expect(result).toHaveLength(0);
    });

    it('should aggregate multiple postings on same day', () => {
      const postings = [
        createMockPosting('2025-01-01', 100),
        createMockPosting('2025-01-01', 150),
      ];
      const workingDays = [new Date('2025-01-01')];

      const result = createContributions(postings, workingDays);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ createdAt: '2025-01-01', contentLength: 250 });
    });
  });

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
