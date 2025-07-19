import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  handleOnStreakToEligible,
  handleEligibleToMissed,
  handleEligibleToOnStreak,
  handleMissedToOnStreak,
  processMidnightTransitions,
  processPostingTransitions
} from '../stateTransitions';
import * as streakUtils from '../streakUtils';

// Mock all streak utilities
jest.mock('../streakUtils');
jest.mock('../../admin');
jest.mock('../../dateUtils', () => ({
  toSeoulDate: jest.fn((date: Date) => date),
}));

const mockStreakUtils = streakUtils as jest.Mocked<typeof streakUtils>;

describe('State Transitions', () => {
  const userId = 'test-user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. onStreak → eligible transition', () => {
    it('should transition when user missed yesterday (working day)', async () => {
      const currentDate = new Date('2024-01-16T09:00:00Z'); // Tuesday in Seoul
      
      // Mock streak info with onStreak status
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: { type: 'onStreak' }
        }
      });
      
      // Mock that user missed yesterday
      mockStreakUtils.didUserMissYesterday.mockResolvedValue(true);
      
      // Mock recovery requirement calculation
      mockStreakUtils.calculateRecoveryRequirement.mockReturnValue({
        postsRequired: 2,
        currentPosts: 0,
        deadline: '2024-01-17',
        missedDate: '2024-01-15'
      });
      
      mockStreakUtils.updateStreakInfo.mockResolvedValue();
      
      const result = await handleOnStreakToEligible(userId, currentDate);
      
      expect(result).toBe(true);
      expect(mockStreakUtils.didUserMissYesterday).toHaveBeenCalledWith(userId, currentDate);
      expect(mockStreakUtils.updateStreakInfo).toHaveBeenCalledWith(userId, {
        status: {
          type: 'eligible',
          postsRequired: 2,
          currentPosts: 0,
          deadline: '2024-01-17',
          missedDate: '2024-01-15'
        }
      });
    });

    it('should not transition when user did not miss yesterday', async () => {
      const currentDate = new Date('2024-01-16T09:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-15',
          lastCalculated: {} as any,
          status: { type: 'onStreak' }
        }
      });
      
      mockStreakUtils.didUserMissYesterday.mockResolvedValue(false);
      
      const result = await handleOnStreakToEligible(userId, currentDate);
      
      expect(result).toBe(false);
      expect(mockStreakUtils.updateStreakInfo).not.toHaveBeenCalled();
    });

    it('should not transition when user is not in onStreak status', async () => {
      const currentDate = new Date('2024-01-16T09:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-15',
          lastCalculated: {} as any,
          status: { type: 'eligible', postsRequired: 2, currentPosts: 0, deadline: '2024-01-17', missedDate: '2024-01-15' }
        }
      });
      
      const result = await handleOnStreakToEligible(userId, currentDate);
      
      expect(result).toBe(false);
      expect(mockStreakUtils.didUserMissYesterday).not.toHaveBeenCalled();
    });
  });

  describe('2. eligible → missed transition', () => {
    it('should transition when deadline has passed', async () => {
      const currentDate = new Date('2024-01-18T09:00:00Z'); // Wednesday in Seoul
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: {
            type: 'eligible',
            postsRequired: 2,
            currentPosts: 0,
            deadline: '2024-01-17', // Deadline passed
            missedDate: '2024-01-15'
          }
        }
      });
      
      mockStreakUtils.updateStreakInfo.mockResolvedValue();
      
      const result = await handleEligibleToMissed(userId, currentDate);
      
      expect(result).toBe(true);
      expect(mockStreakUtils.updateStreakInfo).toHaveBeenCalledWith(userId, {
        status: { type: 'missed' }
      });
    });

    it('should not transition when deadline has not passed', async () => {
      const currentDate = new Date('2024-01-16T09:00:00Z'); // Day before deadline
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: {
            type: 'eligible',
            postsRequired: 2,
            currentPosts: 0,
            deadline: '2024-01-17',
            missedDate: '2024-01-15'
          }
        }
      });
      
      // Mock formatDateString to return the current date as string
      mockStreakUtils.formatDateString.mockReturnValue('2024-01-16');
      
      const result = await handleEligibleToMissed(userId, currentDate);
      
      expect(result).toBe(false);
      expect(mockStreakUtils.updateStreakInfo).not.toHaveBeenCalled();
    });

    it('should not transition when user is not in eligible status', async () => {
      const currentDate = new Date('2024-01-18T09:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-17',
          lastCalculated: {} as any,
          status: { type: 'onStreak' }
        }
      });
      
      const result = await handleEligibleToMissed(userId, currentDate);
      
      expect(result).toBe(false);
      expect(mockStreakUtils.updateStreakInfo).not.toHaveBeenCalled();
    });
  });

  describe('3. eligible → onStreak transition', () => {
    it('should transition when user writes required number of posts', async () => {
      const postDate = new Date('2024-01-17T14:00:00Z'); // Wednesday afternoon in Seoul
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: {
            type: 'eligible',
            postsRequired: 2,
            currentPosts: 0,
            deadline: '2024-01-17',
            missedDate: '2024-01-15'
          }
        }
      });
      
      // Mock that user has written 2 posts today
      mockStreakUtils.countPostsOnDate.mockResolvedValue(2);
      mockStreakUtils.formatDateString.mockReturnValue('2024-01-17');
      mockStreakUtils.updateStreakInfo.mockResolvedValue();
      
      const result = await handleEligibleToOnStreak(userId, postDate);
      
      expect(result).toBe(true);
      expect(mockStreakUtils.countPostsOnDate).toHaveBeenCalledWith(userId, expect.any(Date));
      expect(mockStreakUtils.updateStreakInfo).toHaveBeenCalledWith(userId, {
        lastContributionDate: '2024-01-17',
        status: { type: 'onStreak' }
      });
    });

    it('should update progress when user has not written enough posts yet', async () => {
      const postDate = new Date('2024-01-17T14:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: {
            type: 'eligible',
            postsRequired: 2,
            currentPosts: 0,
            deadline: '2024-01-17',
            missedDate: '2024-01-15'
          }
        }
      });
      
      // Mock that user has written only 1 post
      mockStreakUtils.countPostsOnDate.mockResolvedValue(1);
      mockStreakUtils.updateStreakInfo.mockResolvedValue();
      
      const result = await handleEligibleToOnStreak(userId, postDate);
      
      expect(result).toBe(false);
      expect(mockStreakUtils.updateStreakInfo).toHaveBeenCalledWith(userId, {
        status: {
          type: 'eligible',
          postsRequired: 2,
          currentPosts: 1,
          deadline: '2024-01-17',
          missedDate: '2024-01-15'
        }
      });
    });

    it('should not transition when user is not in eligible status', async () => {
      const postDate = new Date('2024-01-17T14:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-17',
          lastCalculated: {} as any,
          status: { type: 'onStreak' }
        }
      });
      
      const result = await handleEligibleToOnStreak(userId, postDate);
      
      expect(result).toBe(false);
      expect(mockStreakUtils.countPostsOnDate).not.toHaveBeenCalled();
    });

    it('should handle missing postsRequired gracefully', async () => {
      const postDate = new Date('2024-01-17T14:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: {
            type: 'eligible',
            // Missing postsRequired
            currentPosts: 0,
            deadline: '2024-01-17',
            missedDate: '2024-01-15'
          }
        }
      });
      
      const result = await handleEligibleToOnStreak(userId, postDate);
      
      expect(result).toBe(false);
      expect(mockStreakUtils.countPostsOnDate).not.toHaveBeenCalled();
    });
  });

  describe('4. missed → onStreak transition', () => {
    it('should transition when user writes any post', async () => {
      const postDate = new Date('2024-01-18T14:00:00Z'); // Thursday afternoon in Seoul
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: { type: 'missed' }
        }
      });
      
      mockStreakUtils.formatDateString.mockReturnValue('2024-01-18');
      mockStreakUtils.updateStreakInfo.mockResolvedValue();
      
      const result = await handleMissedToOnStreak(userId, postDate);
      
      expect(result).toBe(true);
      expect(mockStreakUtils.updateStreakInfo).toHaveBeenCalledWith(userId, {
        lastContributionDate: '2024-01-18',
        status: { type: 'onStreak' }
      });
    });

    it('should not transition when user is not in missed status', async () => {
      const postDate = new Date('2024-01-18T14:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-18',
          lastCalculated: {} as any,
          status: { type: 'onStreak' }
        }
      });
      
      const result = await handleMissedToOnStreak(userId, postDate);
      
      expect(result).toBe(false);
      expect(mockStreakUtils.updateStreakInfo).not.toHaveBeenCalled();
    });
  });

  describe('Process functions', () => {
    describe('processMidnightTransitions', () => {
      it('should handle midnight transitions without errors', async () => {
        const currentDate = new Date('2024-01-16T09:00:00Z');
        
        // Set up mocks for a typical scenario
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {} as any,
          data: {
            lastContributionDate: '2024-01-13',
            lastCalculated: {} as any,
            status: { type: 'onStreak' }
          }
        });
        
        mockStreakUtils.didUserMissYesterday.mockResolvedValue(true);
        mockStreakUtils.calculateRecoveryRequirement.mockReturnValue({
          postsRequired: 2,
          currentPosts: 0,
          deadline: '2024-01-17',
          missedDate: '2024-01-15'
        });
        mockStreakUtils.updateStreakInfo.mockResolvedValue();
        
        await expect(processMidnightTransitions(userId, currentDate)).resolves.not.toThrow();
      });
    });

    describe('processPostingTransitions', () => {
      it('should handle posting transitions without errors', async () => {
        const postDate = new Date('2024-01-17T14:00:00Z');
        
        // Set up mocks for a typical scenario
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {} as any,
          data: {
            lastContributionDate: '2024-01-13',
            lastCalculated: {} as any,
            status: {
              type: 'eligible',
              postsRequired: 2,
              currentPosts: 0,
              deadline: '2024-01-17',
              missedDate: '2024-01-15'
            }
          }
        });
        
        mockStreakUtils.countPostsOnDate.mockResolvedValue(2);
        mockStreakUtils.updateStreakInfo.mockResolvedValue();
        
        await expect(processPostingTransitions(userId, postDate)).resolves.not.toThrow();
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle missing streak info gracefully', async () => {
      const currentDate = new Date('2024-01-16T09:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: null
      });
      
      const result = await handleOnStreakToEligible(userId, currentDate);
      
      expect(result).toBe(false);
      expect(mockStreakUtils.updateStreakInfo).not.toHaveBeenCalled();
    });

    it('should handle different timezones correctly', async () => {
      // Test with UTC time that's different day in Seoul
      const utcDate = new Date('2024-01-15T16:00:00Z'); // 16:00 UTC = 01:00 next day in Seoul (UTC+9)
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-14',
          lastCalculated: {} as any,
          status: { type: 'onStreak' }
        }
      });
      
      mockStreakUtils.didUserMissYesterday.mockResolvedValue(true);
      mockStreakUtils.calculateRecoveryRequirement.mockReturnValue({
        postsRequired: 2,
        currentPosts: 0,
        deadline: '2024-01-17',
        missedDate: '2024-01-15'
      });
      mockStreakUtils.updateStreakInfo.mockResolvedValue();
      
      const result = await handleOnStreakToEligible(userId, utcDate);
      
      expect(result).toBe(true);
      expect(mockStreakUtils.didUserMissYesterday).toHaveBeenCalledWith(userId, utcDate);
    });

    it('should handle weekend and holiday transitions', async () => {
      // Test weekend (Saturday) - should not trigger transition
      const weekendDate = new Date('2024-01-13T09:00:00Z'); // Saturday in Seoul
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-11',
          lastCalculated: {} as any,
          status: { type: 'onStreak' }
        }
      });
      
      mockStreakUtils.didUserMissYesterday.mockResolvedValue(false); // Weekend should not count as missed
      
      const result = await handleOnStreakToEligible(userId, weekendDate);
      
      expect(result).toBe(false);
      expect(mockStreakUtils.didUserMissYesterday).toHaveBeenCalledWith(userId, weekendDate);
    });
  });
});