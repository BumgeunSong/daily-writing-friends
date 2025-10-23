import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';

// Mock dependencies before imports
jest.mock('../../../commentStyle/userUtils');
jest.mock('../../projection/computeStreakProjection');

import { getActiveBoardId, getActiveUsers } from '../../../commentStyle/userUtils';
import { computeUserStreakProjection } from '../../projection/computeStreakProjection';
import { processWarmupProjections } from '../warmupProjections';

const mockGetActiveBoardId = getActiveBoardId as jest.MockedFunction<typeof getActiveBoardId>;
const mockGetActiveUsers = getActiveUsers as jest.MockedFunction<typeof getActiveUsers>;
const mockComputeProjection = computeUserStreakProjection as jest.MockedFunction<
  typeof computeUserStreakProjection
>;

describe('warmupStreakProjections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when warmup runs', () => {
    it('computes projection for all active users', async () => {
      // Arrange
      mockGetActiveBoardId.mockResolvedValue('board123');
      mockGetActiveUsers.mockResolvedValue(['user1', 'user2', 'user3']);
      mockComputeProjection.mockResolvedValue({
        status: { type: 'onStreak' },
        currentStreak: 5,
        originalStreak: 5,
        longestStreak: 5,
        lastContributionDate: '2025-10-20',
        appliedSeq: 10,
        projectorVersion: 'phase2.1-v1',
        lastEvaluatedDayKey: '2025-10-20',
      });

      // Act
      await processWarmupProjections();

      // Assert
      expect(mockGetActiveBoardId).toHaveBeenCalledTimes(1);
      expect(mockGetActiveUsers).toHaveBeenCalledWith('board123');
      expect(mockComputeProjection).toHaveBeenCalledTimes(3);
      expect(mockComputeProjection).toHaveBeenCalledWith('user1', expect.any(Timestamp));
      expect(mockComputeProjection).toHaveBeenCalledWith('user2', expect.any(Timestamp));
      expect(mockComputeProjection).toHaveBeenCalledWith('user3', expect.any(Timestamp));
    });
  });

  describe('when some users fail', () => {
    it('continues processing remaining users', async () => {
      // Arrange
      mockGetActiveBoardId.mockResolvedValue('board123');
      mockGetActiveUsers.mockResolvedValue(['user1', 'user2', 'user3']);

      // Mock: first succeeds, second fails, third succeeds
      mockComputeProjection
        .mockResolvedValueOnce({
          status: { type: 'onStreak' },
          currentStreak: 5,
          originalStreak: 5,
          longestStreak: 5,
          lastContributionDate: '2025-10-20',
          appliedSeq: 10,
          projectorVersion: 'phase2.1-v1',
          lastEvaluatedDayKey: '2025-10-20',
        })
        .mockRejectedValueOnce(new Error('Firestore timeout'))
        .mockResolvedValueOnce({
          status: { type: 'missed' },
          currentStreak: 0,
          originalStreak: 3,
          longestStreak: 5,
          lastContributionDate: '2025-10-18',
          appliedSeq: 8,
          projectorVersion: 'phase2.1-v1',
          lastEvaluatedDayKey: '2025-10-20',
        });

      // Act
      await processWarmupProjections();

      // Assert: Should complete without throwing
      expect(mockComputeProjection).toHaveBeenCalledTimes(3);
    });
  });

  describe('when no active users exist', () => {
    it('completes without errors', async () => {
      // Arrange
      mockGetActiveBoardId.mockResolvedValue('board123');
      mockGetActiveUsers.mockResolvedValue([]);

      // Act
      await processWarmupProjections();

      // Assert
      expect(mockComputeProjection).not.toHaveBeenCalled();
    });
  });

  describe('when getActiveBoardId fails', () => {
    it('throws error and does not process users', async () => {
      // Arrange
      mockGetActiveBoardId.mockRejectedValue(new Error('Remote Config unavailable'));

      // Act & Assert
      await expect(processWarmupProjections()).rejects.toThrow('Remote Config unavailable');
      expect(mockGetActiveUsers).not.toHaveBeenCalled();
      expect(mockComputeProjection).not.toHaveBeenCalled();
    });
  });
});
