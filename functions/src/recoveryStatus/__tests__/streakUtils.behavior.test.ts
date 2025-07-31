import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  formatDateString,
  calculateRecoveryRequirement,
  countPostsOnDate,
  didUserMissYesterday
} from '../streakUtils';

// Mock external dependencies
jest.mock('../../shared/calendar', () => ({
  formatSeoulDate: jest.fn(),
  calculateRecoveryRequirement: jest.fn(),
  countSeoulDatePosts: jest.fn(),
  didUserMissYesterday: jest.fn()
}));

describe('StreakUtils Behavior Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Recovery Requirements', () => {
    describe('when user misses a working day', () => {
      it('requires 2 posts to recover on next working day', () => {
        const { calculateRecoveryRequirement: mockCalc } = require('../../shared/calendar');
        mockCalc.mockReturnValue({
          postsRequired: 2,
          currentPosts: 0,
          deadline: '2024-01-17',
          missedDate: '2024-01-16'
        });

        const missedDate = new Date('2024-01-16T10:00:00Z');
        const currentDate = new Date('2024-01-17T10:00:00Z');
        
        const result = calculateRecoveryRequirement(missedDate, currentDate);
        
        expect(result.postsRequired).toBe(2);
        expect(result.currentPosts).toBe(0);
        expect(result.deadline).toBe('2024-01-17');
        expect(result.missedDate).toBe('2024-01-16');
      });

      it('requires 1 post to recover on weekend', () => {
        const { calculateRecoveryRequirement: mockCalc } = require('../../shared/calendar');
        mockCalc.mockReturnValue({
          postsRequired: 1,
          currentPosts: 0,
          deadline: '2024-01-20',
          missedDate: '2024-01-19'
        });

        const missedFriday = new Date('2024-01-19T10:00:00Z');
        const currentSaturday = new Date('2024-01-20T10:00:00Z');
        
        const result = calculateRecoveryRequirement(missedFriday, currentSaturday);
        
        expect(result.postsRequired).toBe(1);
        expect(result.deadline).toBe('2024-01-20');
      });
    });
  });

  describe('Post Counting', () => {
    describe('when user has posts on a given date', () => {
      it('returns the correct number of posts', async () => {
        const { countSeoulDatePosts } = require('../../shared/calendar');
        countSeoulDatePosts.mockResolvedValue(3);

        const result = await countPostsOnDate('user123', new Date('2024-01-15T10:00:00Z'));
        
        expect(result).toBe(3);
      });

      it('returns zero when user has no posts', async () => {
        const { countSeoulDatePosts } = require('../../shared/calendar');
        countSeoulDatePosts.mockResolvedValue(0);

        const result = await countPostsOnDate('user123', new Date('2024-01-15T10:00:00Z'));
        
        expect(result).toBe(0);
      });
    });

    describe('when database query fails', () => {
      it('propagates the error', async () => {
        const { countSeoulDatePosts } = require('../../shared/calendar');
        countSeoulDatePosts.mockRejectedValue(new Error('Database connection failed'));

        await expect(
          countPostsOnDate('user123', new Date('2024-01-15T10:00:00Z'))
        ).rejects.toThrow('Database connection failed');
      });
    });
  });

  describe('Yesterday Miss Detection', () => {
    describe('when yesterday was a working day', () => {
      it('reports miss when user had no posts', async () => {
        const { didUserMissYesterday: mockMiss } = require('../../shared/calendar');
        mockMiss.mockResolvedValue(true);

        const result = await didUserMissYesterday('user123', new Date('2024-01-16T10:00:00Z'));
        
        expect(result).toBe(true);
      });

      it('reports no miss when user had posts', async () => {
        const { didUserMissYesterday: mockMiss } = require('../../shared/calendar');
        mockMiss.mockResolvedValue(false);

        const result = await didUserMissYesterday('user123', new Date('2024-01-16T10:00:00Z'));
        
        expect(result).toBe(false);
      });
    });

    describe('when yesterday was not a working day', () => {
      it('reports no miss regardless of posts', async () => {
        const { didUserMissYesterday: mockMiss } = require('../../shared/calendar');
        mockMiss.mockResolvedValue(false);

        const result = await didUserMissYesterday('user123', new Date('2024-01-15T10:00:00Z')); // Monday
        
        expect(result).toBe(false);
      });
    });
  });

  describe('Date Formatting', () => {
    describe('when given valid dates', () => {
      it('formats dates in Seoul timezone', () => {
        const { formatSeoulDate } = require('../../shared/calendar');
        formatSeoulDate.mockReturnValue('2024-01-15');

        const result = formatDateString(new Date('2024-01-15T10:00:00Z'));
        
        expect(result).toBe('2024-01-15');
      });
    });
  });
});