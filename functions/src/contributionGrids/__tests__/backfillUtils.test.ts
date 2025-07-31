import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import {
  generateUserGrids,
  processBatchUsers,
  calculateBackfillResult,
  UserData,
} from '../backfillUtils';

// Mock gridBuilder
jest.mock('../gridBuilder', () => ({
  buildGridFromActivities: jest.fn(),
}));

// Mock gridUtils
jest.mock('../gridUtils', () => ({
  getWindowRange: jest.fn(() => ({
    start: new Date('2024-01-15'),
    end: new Date('2024-01-19'),
  })),
  formatDate: jest.fn((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }),
}));

describe('Backfill Utils', () => {
  const { buildGridFromActivities } = require('../gridBuilder');
  // Mock functions are already set up above

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateUserGrids', () => {
    it('should generate grids for user with postings and commentings', () => {
      const userData: UserData = {
        userId: 'user123',
        postings: [
          {
            board: { id: 'board1' },
            post: { id: 'post1', title: 'Test Post', contentLength: 100 },
            createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          } as any,
        ],
        commentings: [
          {
            board: { id: 'board1' },
            post: { id: 'post1' },
            comment: { id: 'comment1', content: 'Test comment' },
            createdAt: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          } as any,
        ],
      };

      // Mock gridBuilder responses
      buildGridFromActivities
        .mockReturnValueOnce([{ day: '2024-01-15', value: 100, week: 0, column: 1 }])
        .mockReturnValueOnce([{ day: '2024-01-16', value: 1, week: 0, column: 2 }]);

      const result = generateUserGrids(userData);

      expect(result.userId).toBe('user123');
      expect(result.hasPostings).toBe(true);
      expect(result.hasCommentings).toBe(true);
      expect(result.postingGrid).toBeDefined();
      expect(result.commentingGrid).toBeDefined();
      expect(result.postingGrid?.maxValue).toBe(100);
      expect(result.commentingGrid?.maxValue).toBe(1);
      expect(result.postingGrid?.lastUpdated).toHaveProperty('seconds');
      expect(result.postingGrid?.lastUpdated).toHaveProperty('nanoseconds');
    });

    it('should generate grids for user with no activities', () => {
      const userData: UserData = {
        userId: 'user123',
        postings: [],
        commentings: [],
      };

      buildGridFromActivities.mockReturnValueOnce([]).mockReturnValueOnce([]);

      const result = generateUserGrids(userData);

      expect(result.userId).toBe('user123');
      expect(result.hasPostings).toBe(false);
      expect(result.hasCommentings).toBe(false);
      expect(result.postingGrid?.maxValue).toBe(0);
      expect(result.commentingGrid?.maxValue).toBe(0);
    });
  });

  describe('processBatchUsers', () => {
    it('should process users and return updates', () => {
      const userDataList: UserData[] = [
        {
          userId: 'user1',
          postings: [],
          commentings: [],
        },
        {
          userId: 'user2',
          postings: [],
          commentings: [],
        },
      ];

      buildGridFromActivities.mockReturnValue([]);

      const result = processBatchUsers(userDataList, 1, 2);

      expect(result.updates).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.updates[0].userId).toBe('user1');
      expect(result.updates[1].userId).toBe('user2');
    });

    it('should skip users with existing grids when skipExisting is true', () => {
      const userDataList: UserData[] = [
        {
          userId: 'user1',
          postings: [],
          commentings: [],
        },
      ];

      const existingGrids = new Set(['user1_posting', 'user1_commenting']);

      const result = processBatchUsers(userDataList, 1, 1, true, existingGrids);

      expect(result.updates).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors gracefully', () => {
      const userDataList: UserData[] = [
        {
          userId: 'user1',
          postings: [],
          commentings: [],
        },
      ];

      buildGridFromActivities.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = processBatchUsers(userDataList, 1, 1);

      expect(result.updates).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].userId).toBe('user1');
      expect(result.errors[0].error).toBe('Test error');
    });
  });

  describe('calculateBackfillResult', () => {
    it('should calculate correct result', () => {
      const startTime = Date.now() - 1000; // 1 second ago
      const errors = [{ userId: 'user1', error: 'Test error' }];

      const result = calculateBackfillResult(10, 8, 6, 1, 1, errors, startTime);

      expect(result.totalUsers).toBe(10);
      expect(result.processedUsers).toBe(8);
      expect(result.updatedUsers).toBe(6);
      expect(result.skippedUsers).toBe(1);
      expect(result.errorUsers).toBe(1);
      expect(result.errors).toEqual(errors);
      expect(result.executionTimeMs).toBeGreaterThan(0);
    });
  });
});
