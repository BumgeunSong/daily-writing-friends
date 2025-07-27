import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import {
  calculatePostingContributionUpdate,
  calculateCommentingContributionUpdate,
} from '../realtimeUpdater';
import { Posting } from '../../postings/Posting';
import { Commenting } from '../../commentings/Commenting';
import { ActivityType, ContributionGrid } from '../types';

// Mock Firebase Admin
const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
    })),
  })),
};

jest.mock('../../shared/admin', () => ({
  default: {
    firestore: jest.fn(() => mockFirestore),
  },
}));

// Mock dateUtils
jest.mock('../../shared/dateUtils', () => ({
  toSeoulDate: jest.fn((date: Date) => date),
}));

// Mock gridUtils
jest.mock('../gridUtils', () => ({
  formatDate: jest.fn((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }),
  updateContributionForDate: jest.fn((contributions: any[], date: string, value: number) => {
    const updated = [...contributions];
    const existing = updated.find((c) => c.day === date);
    if (existing) {
      existing.value += value;
    } else {
      updated.push({ day: date, value, week: 0, column: 0 });
    }
    return updated;
  }),
  sortAndLimitContributions: jest.fn((contributions: any[]) => {
    const sorted = [...contributions].sort((a, b) => a.day.localeCompare(b.day));
    return sorted.slice(-20); // Keep last 20
  }),
  calculateMaxValue: jest.fn((contributions: any[]) => {
    return Math.max(...contributions.map((c) => c.value), 0);
  }),
  calculateTimeRange: jest.fn((contributions: any[], date: string) => {
    if (contributions.length === 0) {
      return { startDate: date, endDate: date };
    }
    const sorted = [...contributions].sort((a, b) => a.day.localeCompare(b.day));
    return { startDate: sorted[0].day, endDate: sorted[sorted.length - 1].day };
  }),
}));

describe('Real-time Contribution Grid Updater', () => {
  const { toSeoulDate } = require('../../shared/dateUtils');

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset toSeoulDate mock to default behavior
    toSeoulDate.mockImplementation((date: Date) => date);
  });

  describe('calculatePostingContributionUpdate', () => {
    it('should calculate correct posting contribution update with empty grid', () => {
      const userId = 'user123';
      const postingData: Posting = {
        board: { id: 'board1' },
        post: { id: 'post1', title: 'Test Post', contentLength: 150 },
        createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
      };

      const result = calculatePostingContributionUpdate(userId, postingData, null);

      expect(result).toEqual({
        userId: 'user123',
        activityType: ActivityType.POSTING,
        date: '2024-01-15',
        value: 150,
        reason: 'Posting created with 150 characters',
        maxValue: 150,
        lastUpdated: expect.any(Timestamp),
        timeRange: {
          startDate: '2024-01-15',
          endDate: '2024-01-15',
        },
      });
    });

    it('should calculate correct posting contribution update with existing grid', () => {
      const userId = 'user123';
      const postingData: Posting = {
        board: { id: 'board1' },
        post: { id: 'post1', title: 'Test Post', contentLength: 100 },
        createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
      };

      const existingGrid: ContributionGrid = {
        contributions: [
          { day: '2024-01-14', value: 50, week: 0, column: 0 },
          { day: '2024-01-15', value: 75, week: 0, column: 1 },
        ],
        maxValue: 75,
        lastUpdated: Timestamp.now(),
        timeRange: {
          startDate: '2024-01-14',
          endDate: '2024-01-15',
        },
      };

      const result = calculatePostingContributionUpdate(userId, postingData, existingGrid);

      expect(result).toEqual({
        userId: 'user123',
        activityType: ActivityType.POSTING,
        date: '2024-01-15',
        value: 100,
        reason: 'Posting created with 100 characters',
        maxValue: 175, // 75 + 100
        lastUpdated: expect.any(Timestamp),
        timeRange: {
          startDate: '2024-01-14',
          endDate: '2024-01-15',
        },
      });
    });

    it('should handle missing createdAt with fallback', () => {
      const userId = 'user123';
      const postingData: Posting = {
        board: { id: 'board1' },
        post: { id: 'post1', title: 'Test Post', contentLength: 50 },
        createdAt: undefined as any,
      };

      const result = calculatePostingContributionUpdate(userId, postingData, null);

      expect(result).toBeDefined();
      expect(result?.userId).toBe('user123');
      expect(result?.activityType).toBe(ActivityType.POSTING);
      expect(result?.value).toBe(50);
      expect(result?.reason).toBe('Posting created with 50 characters');
      expect(result?.maxValue).toBe(50);
      expect(result?.timeRange).toBeDefined();
    });

    it('should use minimum value of 1 for empty content', () => {
      const userId = 'user123';
      const postingData: Posting = {
        board: { id: 'board1' },
        post: { id: 'post1', title: 'Test Post', contentLength: 0 },
        createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
      };

      const result = calculatePostingContributionUpdate(userId, postingData, null);

      expect(result?.value).toBe(1);
      expect(result?.reason).toBe('Posting created with 1 characters');
      expect(result?.maxValue).toBe(1);
    });

    it('should return null on error', () => {
      const userId = 'user123';
      const postingData: Posting = {
        board: { id: 'board1' },
        post: { id: 'post1', title: 'Test Post', contentLength: 100 },
        createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
      };

      // Mock toSeoulDate to throw error
      toSeoulDate.mockImplementation(() => {
        throw new Error('Invalid date');
      });

      const result = calculatePostingContributionUpdate(userId, postingData, null);

      expect(result).toBeNull();
    });
  });

  describe('calculateCommentingContributionUpdate', () => {
    it('should calculate correct commenting contribution update with empty grid', () => {
      const userId = 'user123';
      const commentingData: Commenting = {
        board: { id: 'board1' },
        post: { id: 'post1', title: 'Test Post', authorId: 'user123' },
        comment: { id: 'comment1' },
        createdAt: Timestamp.fromDate(new Date('2024-01-15T14:30:00Z')),
      };

      const result = calculateCommentingContributionUpdate(userId, commentingData, null);

      expect(result).toEqual({
        userId: 'user123',
        activityType: ActivityType.COMMENTING,
        date: '2024-01-15',
        value: 1,
        reason: 'Comment created',
        maxValue: 1,
        lastUpdated: expect.any(Timestamp),
        timeRange: {
          startDate: '2024-01-15',
          endDate: '2024-01-15',
        },
      });
    });

    it('should calculate correct commenting contribution update with existing grid', () => {
      const userId = 'user123';
      const commentingData: Commenting = {
        board: { id: 'board1' },
        post: { id: 'post1', title: 'Test Post', authorId: 'user123' },
        comment: { id: 'comment1' },
        createdAt: Timestamp.fromDate(new Date('2024-01-15T14:30:00Z')),
      };

      const existingGrid: ContributionGrid = {
        contributions: [
          { day: '2024-01-14', value: 2, week: 0, column: 0 },
          { day: '2024-01-15', value: 3, week: 0, column: 1 },
        ],
        maxValue: 3,
        lastUpdated: Timestamp.now(),
        timeRange: {
          startDate: '2024-01-14',
          endDate: '2024-01-15',
        },
      };

      const result = calculateCommentingContributionUpdate(userId, commentingData, existingGrid);

      expect(result).toEqual({
        userId: 'user123',
        activityType: ActivityType.COMMENTING,
        date: '2024-01-15',
        value: 1,
        reason: 'Comment created',
        maxValue: 4, // 3 + 1
        lastUpdated: expect.any(Timestamp),
        timeRange: {
          startDate: '2024-01-14',
          endDate: '2024-01-15',
        },
      });
    });

    it('should always return value of 1 for comments', () => {
      const userId = 'user123';
      const commentingData: Commenting = {
        board: { id: 'board1' },
        post: { id: 'post1', title: 'Test Post', authorId: 'user123' },
        comment: { id: 'comment1' },
        createdAt: Timestamp.fromDate(new Date('2024-01-15T14:30:00Z')),
      };

      const result = calculateCommentingContributionUpdate(userId, commentingData, null);

      expect(result?.value).toBe(1);
      expect(result?.maxValue).toBe(1);
    });

    it('should return null on error', () => {
      const userId = 'user123';
      const commentingData: Commenting = {
        board: { id: 'board1' },
        post: { id: 'post1', title: 'Test Post', authorId: 'user123' },
        comment: { id: 'comment1' },
        createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
      };

      // Mock toSeoulDate to throw error
      toSeoulDate.mockImplementation(() => {
        throw new Error('Invalid date');
      });

      const result = calculateCommentingContributionUpdate(userId, commentingData, null);

      expect(result).toBeNull();
    });
  });

  // Note: applyContributionGridUpdate is a side effect function that interacts with Firestore
  // We focus on testing the pure logic functions above instead
});
