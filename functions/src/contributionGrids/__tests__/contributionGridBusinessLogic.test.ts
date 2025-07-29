import { Timestamp } from 'firebase-admin/firestore';
import {
  calculatePostingContributionResult,
  calculateCommentingContributionResult,
  calculateUpdatedGrid,
  validateContributionUpdate,
  shouldProcessUpdate,
  calculateBatchResult,
} from '../services/contributionGridBusinessLogic';
import { ActivityType, ContributionGrid, ContributionGridUpdate } from '../domain/models';
import { Posting } from '../../postings/Posting';
import { Commenting } from '../../commentings/Commenting';

/**
 * Unit Tests for Pure Business Logic Functions
 * These tests demonstrate output-based testing with no mocks needed
 */

describe('ContributionGridBusinessLogic', () => {
  const mockTimestamp = Timestamp.fromDate(new Date('2024-01-15T10:00:00Z'));

  const createMockPosting = (contentLength: number = 100): Posting => ({
    id: 'post-1',
    userId: 'user-1',
    boardId: 'board-1',
    post: {
      title: 'Test Post',
      content: 'Test content',
      contentLength,
    },
    createdAt: mockTimestamp,
  });

  const createMockCommenting = (): Commenting => ({
    id: 'comment-1',
    userId: 'user-1',
    boardId: 'board-1',
    postId: 'post-1',
    comment: {
      content: 'Test comment',
    },
    createdAt: mockTimestamp,
  });

  const createMockGrid = (): ContributionGrid => ({
    contributions: [
      { day: '2024-01-14', value: 50, week: 0, column: 0 },
      { day: '2024-01-15', value: 75, week: 0, column: 1 },
    ],
    maxValue: 75,
    lastUpdated: mockTimestamp,
    timeRange: {
      startDate: '2024-01-14',
      endDate: '2024-01-15',
    },
  });

  const createMockUpdate = (): ContributionGridUpdate => ({
    userId: 'user-1',
    activityType: ActivityType.POSTING,
    date: '2024-01-16',
    value: 100,
    reason: 'Test update',
    maxValue: 100,
    lastUpdated: mockTimestamp,
    timeRange: {
      startDate: '2024-01-14',
      endDate: '2024-01-16',
    },
  });

  describe('calculatePostingContributionResult', () => {
    it('should successfully calculate posting contribution with existing grid', () => {
      const posting = createMockPosting(120);
      const existingGrid = createMockGrid();

      const result = calculatePostingContributionResult('user-1', posting, existingGrid);

      expect(result.success).toBe(true);
      expect(result.update).toBeDefined();
      expect(result.update?.value).toBe(120);
      expect(result.update?.activityType).toBe(ActivityType.POSTING);
      expect(result.error).toBeUndefined();
    });

    it('should successfully calculate posting contribution with null grid', () => {
      const posting = createMockPosting(80);

      const result = calculatePostingContributionResult('user-1', posting, null);

      expect(result.success).toBe(true);
      expect(result.update).toBeDefined();
      expect(result.update?.value).toBe(80);
    });

    it('should handle errors gracefully', () => {
      const invalidPosting = { ...createMockPosting(), createdAt: null } as any;

      const result = calculatePostingContributionResult('user-1', invalidPosting, null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.update).toBeUndefined();
    });
  });

  describe('calculateCommentingContributionResult', () => {
    it('should successfully calculate commenting contribution', () => {
      const commenting = createMockCommenting();
      const existingGrid = createMockGrid();

      const result = calculateCommentingContributionResult('user-1', commenting, existingGrid);

      expect(result.success).toBe(true);
      expect(result.update).toBeDefined();
      expect(result.update?.value).toBe(1); // Comments always have value 1
      expect(result.update?.activityType).toBe(ActivityType.COMMENTING);
    });
  });

  describe('calculateUpdatedGrid', () => {
    it('should merge update with existing grid correctly', () => {
      const update = createMockUpdate();
      const existingGrid = createMockGrid();

      const result = calculateUpdatedGrid(update, existingGrid);

      expect(result.contributions).toHaveLength(3); // 2 existing + 1 new
      expect(result.maxValue).toBe(100); // Updated to new max
      expect(result.timeRange.endDate).toBe('2024-01-16'); // Extended range
    });

    it('should handle null existing grid', () => {
      const update = createMockUpdate();

      const result = calculateUpdatedGrid(update, null);

      expect(result.contributions).toHaveLength(1);
      expect(result.contributions[0].day).toBe('2024-01-16');
      expect(result.contributions[0].value).toBe(100);
    });
  });

  describe('validateContributionUpdate', () => {
    it('should validate correct update', () => {
      const update = createMockUpdate();

      const result = validateContributionUpdate(update);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing userId', () => {
      const update = { ...createMockUpdate(), userId: '' };

      const result = validateContributionUpdate(update);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('userId is required and must be a string');
    });

    it('should detect invalid date format', () => {
      const update = { ...createMockUpdate(), date: '2024/01/16' };

      const result = validateContributionUpdate(update);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('date is required and must be in YYYY-MM-DD format');
    });

    it('should detect negative value', () => {
      const update = { ...createMockUpdate(), value: -5 };

      const result = validateContributionUpdate(update);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('value must be a non-negative number');
    });
  });

  describe('shouldProcessUpdate', () => {
    it('should process valid meaningful update', () => {
      const update = createMockUpdate();
      const existingGrid = createMockGrid();

      const result = shouldProcessUpdate(update, existingGrid);

      expect(result.shouldProcess).toBe(true);
      expect(result.reason).toBe('Update is valid and meaningful');
    });

    it('should skip update with zero value', () => {
      const update = { ...createMockUpdate(), value: 0 };

      const result = shouldProcessUpdate(update, null);

      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toBe('Update value is zero, no change needed');
    });

    it('should skip update with invalid data', () => {
      const update = { ...createMockUpdate(), userId: '' };

      const result = shouldProcessUpdate(update, null);

      expect(result.shouldProcess).toBe(false);
      expect(result.reason).toContain('Validation failed');
    });
  });

  describe('calculateBatchResult', () => {
    it('should calculate batch statistics correctly', () => {
      const updates = [
        { userId: 'user-1', activityType: ActivityType.POSTING, grid: createMockGrid() },
        { userId: 'user-1', activityType: ActivityType.COMMENTING, grid: createMockGrid() },
        { userId: 'user-2', activityType: ActivityType.POSTING, grid: createMockGrid() },
      ];

      const result = calculateBatchResult(updates);

      expect(result.totalUpdates).toBe(3);
      expect(result.postingUpdates).toBe(2);
      expect(result.commentingUpdates).toBe(1);
      expect(result.userCount).toBe(2); // unique users
    });

    it('should handle empty batch', () => {
      const result = calculateBatchResult([]);

      expect(result.totalUpdates).toBe(0);
      expect(result.postingUpdates).toBe(0);
      expect(result.commentingUpdates).toBe(0);
      expect(result.userCount).toBe(0);
    });
  });
});