import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import { executeContributionGridBackfill } from '../backfillScript';
import { ContributionGrid } from '../types';

// Mock Firebase Admin
const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      collection: jest.fn(() => ({
        get: jest.fn(),
        where: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
    })),
    get: jest.fn(),
    where: jest.fn(() => ({
      get: jest.fn(),
    })),
  })),
  batch: jest.fn(() => ({
    set: jest.fn(),
    commit: jest.fn(),
  })),
} as any;

jest.mock('../../shared/admin', () => ({
  default: {
    firestore: jest.fn(() => mockFirestore),
  },
}));

// Mock the admin import in the backfill script
jest.mock('../backfillScript', () => {
  const originalModule = jest.requireActual('../backfillScript');
  return {
    ...originalModule,
    default: {
      firestore: jest.fn(() => mockFirestore),
    },
  };
});

// Mock gridBuilder
jest.mock('../gridBuilder', () => ({
  buildGridFromActivities: jest.fn(),
}));

describe('Contribution Grid Backfill Script', () => {
  const { buildGridFromActivities } = require('../gridBuilder');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeContributionGridBackfill', () => {
    it('should return empty result when no users exist', async () => {
      // Mock empty users collection
      mockFirestore.collection().get.mockResolvedValue({
        docs: [],
      });

      const result = await executeContributionGridBackfill({ dryRun: true });

      expect(result).toEqual({
        totalUsers: 0,
        processedUsers: 0,
        updatedUsers: 0,
        skippedUsers: 0,
        errorUsers: 0,
        errors: [],
        executionTimeMs: expect.any(Number),
      });
    });

    it('should process users and generate contribution grids', async () => {
      // Mock users
      const mockUsers = [
        { id: 'user1', data: () => ({ nickname: 'User1' }) },
        { id: 'user2', data: () => ({ nickname: 'User2' }) },
      ];

      // Mock user postings and commentings
      const mockPostings = [
        {
          id: 'post1',
          data: () => ({
            board: { id: 'board1' },
            post: { id: 'post1', title: 'Test Post', contentLength: 100 },
            createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          }),
        },
      ];

      const mockCommentings = [
        {
          id: 'comment1',
          data: () => ({
            board: { id: 'board1' },
            post: { id: 'post1' },
            comment: { id: 'comment1', content: 'Test comment' },
            createdAt: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          }),
        },
      ];

      // Mock Firestore responses
      mockFirestore.collection().get.mockResolvedValue({
        docs: mockUsers,
      });

      mockFirestore
        .collection()
        .doc()
        .collection()
        .get.mockResolvedValueOnce({ docs: mockPostings }) // user1 postings
        .mockResolvedValueOnce({ docs: mockCommentings }) // user1 commentings
        .mockResolvedValueOnce({ docs: [] }) // user2 postings
        .mockResolvedValueOnce({ docs: [] }); // user2 commentings

      // Mock gridBuilder
      const mockPostingGrid: ContributionGrid = {
        contributions: [{ day: '2024-01-15', value: 100, week: 0, column: 1 }],
        maxValue: 100,
        lastUpdated: Timestamp.now(),
        timeRange: { startDate: '2024-01-15', endDate: '2024-01-15' },
      };

      const mockCommentingGrid: ContributionGrid = {
        contributions: [{ day: '2024-01-16', value: 1, week: 0, column: 2 }],
        maxValue: 1,
        lastUpdated: Timestamp.now(),
        timeRange: { startDate: '2024-01-16', endDate: '2024-01-16' },
      };

      buildGridFromActivities
        .mockResolvedValueOnce(mockPostingGrid) // user1 posting grid
        .mockResolvedValueOnce(mockCommentingGrid) // user1 commenting grid
        .mockResolvedValueOnce(mockPostingGrid) // user2 posting grid (empty)
        .mockResolvedValueOnce(mockCommentingGrid); // user2 commenting grid (empty)

      const result = await executeContributionGridBackfill({ dryRun: true });

      expect(result.totalUsers).toBe(2);
      expect(result.processedUsers).toBe(2);
      expect(result.updatedUsers).toBe(2); // Both users get grids (even if empty)
      expect(result.skippedUsers).toBe(0);
      expect(result.errorUsers).toBe(0);
      expect(result.errors).toEqual([]);
      expect(result.executionTimeMs).toBeGreaterThan(0);

      // Verify gridBuilder was called for each user and activity type
      expect(buildGridFromActivities).toHaveBeenCalledTimes(4);
    });

    it('should handle errors gracefully and continue processing', async () => {
      // Mock users
      const mockUsers = [
        { id: 'user1', data: () => ({ nickname: 'User1' }) },
        { id: 'user2', data: () => ({ nickname: 'User2' }) },
      ];

      mockFirestore.collection().get.mockResolvedValue({
        docs: mockUsers,
      });

      // Mock error for user1
      mockFirestore
        .collection()
        .doc()
        .collection()
        .get.mockRejectedValueOnce(new Error('Database error')) // user1 postings error
        .mockResolvedValueOnce({ docs: [] }) // user2 postings
        .mockResolvedValueOnce({ docs: [] }); // user2 commentings

      // Mock success for user2
      buildGridFromActivities.mockResolvedValueOnce({
        contributions: [],
        maxValue: 0,
        lastUpdated: Timestamp.now(),
        timeRange: { startDate: '2024-01-15', endDate: '2024-01-15' },
      });

      const result = await executeContributionGridBackfill({ dryRun: true });

      expect(result.totalUsers).toBe(2);
      expect(result.processedUsers).toBe(2);
      expect(result.updatedUsers).toBe(1); // Only user2 updated
      expect(result.errorUsers).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].userId).toBe('user1');
      expect(result.errors[0].error).toContain('Database error');
    });

    it('should respect maxUsers limit', async () => {
      // Mock 10 users
      const mockUsers = Array.from({ length: 10 }, (_, i) => ({
        id: `user${i}`,
        data: () => ({ nickname: `User${i}` }),
      }));

      mockFirestore.collection().get.mockResolvedValue({
        docs: mockUsers,
      });

      // Mock empty data for all users
      mockFirestore.collection().doc().collection().get.mockResolvedValue({ docs: [] });

      buildGridFromActivities.mockResolvedValue({
        contributions: [],
        maxValue: 0,
        lastUpdated: Timestamp.now(),
        timeRange: { startDate: '2024-01-15', endDate: '2024-01-15' },
      });

      const result = await executeContributionGridBackfill({
        dryRun: true,
        maxUsers: 3,
      });

      expect(result.totalUsers).toBe(3); // Limited to 3 users
      expect(result.processedUsers).toBe(3);
    });

    it('should skip users that already have contribution grids', async () => {
      const mockUsers = [{ id: 'user1', data: () => ({ nickname: 'User1' }) }];

      mockFirestore.collection().get.mockResolvedValue({
        docs: mockUsers,
      });

      // Mock existing contribution grids
      mockFirestore
        .collection()
        .doc()
        .get.mockResolvedValueOnce({ exists: true }) // user1_posting exists
        .mockResolvedValueOnce({ exists: true }); // user1_commenting exists

      const result = await executeContributionGridBackfill({ dryRun: true });

      expect(result.totalUsers).toBe(1);
      expect(result.processedUsers).toBe(1);
      expect(result.updatedUsers).toBe(0); // Skipped
      expect(result.skippedUsers).toBe(1);
      expect(result.errorUsers).toBe(0);
    });

    it('should apply updates when not in dry run mode', async () => {
      const mockUsers = [{ id: 'user1', data: () => ({ nickname: 'User1' }) }];

      mockFirestore.collection().get.mockResolvedValue({
        docs: mockUsers,
      });

      mockFirestore.collection().doc().collection().get.mockResolvedValue({ docs: [] });

      mockFirestore.collection().doc().get.mockResolvedValue({ exists: false }); // No existing grids

      buildGridFromActivities.mockResolvedValue({
        contributions: [],
        maxValue: 0,
        lastUpdated: Timestamp.now(),
        timeRange: { startDate: '2024-01-15', endDate: '2024-01-15' },
      });

      await executeContributionGridBackfill({ dryRun: false });

      // Verify Firestore batch operations were called
      expect(mockFirestore.batch).toHaveBeenCalled();
      expect(mockFirestore.batch().set).toHaveBeenCalled();
      expect(mockFirestore.batch().commit).toHaveBeenCalled();
    });
  });
});
