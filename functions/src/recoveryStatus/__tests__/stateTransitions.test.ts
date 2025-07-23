import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import {
  calculateOnStreakToEligible,
  calculateEligibleToMissed,
  calculateEligibleToOnStreak,
  calculateMissedToOnStreak,
  calculateMidnightTransitions,
  calculatePostingTransitions,
  calculateOnStreakToOnStreak
} from '../stateTransitions';
import { RecoveryStatusType, StreakInfo } from '../StreakInfo';
import * as streakUtils from '../streakUtils';

// Mock all streak utilities
jest.mock('../streakUtils');
jest.mock('../../shared/admin');
jest.mock('../../shared/dateUtils', () => ({
  toSeoulDate: jest.fn((date: Date) => date),
}));

const mockStreakUtils = streakUtils as jest.Mocked<typeof streakUtils>;

describe('State Transitions - Output-Based Testing', () => {
  const userId = 'test-user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. onStreak → eligible transition', () => {
    it('should return DBUpdate when user missed yesterday (working day)', async () => {
      const currentDate = new Date('2024-01-16T09:00:00Z'); // Tuesday in Seoul
      
      // Mock streak info with onStreak status
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: { type: RecoveryStatusType.ON_STREAK },
          currentStreak: 0,
          longestStreak: 0
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
      
      const result = await calculateOnStreakToEligible(userId, currentDate);
      
      expect(result).toEqual({
        userId,
        updates: {
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 0,
            deadline: '2024-01-17',
            missedDate: '2024-01-15'
          },
          lastCalculated: expect.any(Object)
        },
        reason: 'onStreak → eligible (missed 2024-01-15)'
      });
    });

    it('should return null when user did not miss yesterday', async () => {
      const currentDate = new Date('2024-01-16T09:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-15',
          lastCalculated: {} as any,
          status: { type: RecoveryStatusType.ON_STREAK },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      mockStreakUtils.didUserMissYesterday.mockResolvedValue(false);
      
      const result = await calculateOnStreakToEligible(userId, currentDate);
      
      expect(result).toBeNull();
    });

    it('should return null when user is not in onStreak status', async () => {
      const currentDate = new Date('2024-01-16T09:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-15',
          lastCalculated: {} as any,
          status: { type: RecoveryStatusType.ELIGIBLE, postsRequired: 2, currentPosts: 0, deadline: '2024-01-17', missedDate: '2024-01-15' },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      const result = await calculateOnStreakToEligible(userId, currentDate);
      
      expect(result).toBeNull();
    });
  });

  describe('2. eligible → missed transition', () => {
    it('should return DBUpdate when deadline has passed', async () => {
      const currentDate = new Date('2024-01-18T09:00:00Z'); // Wednesday in Seoul
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 0,
            deadline: '2024-01-17', // Deadline passed
            missedDate: '2024-01-15'
          },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      mockStreakUtils.formatDateString.mockReturnValue('2024-01-18');
      mockStreakUtils.isDateAfter.mockReturnValue(true); // Current date is after deadline
      
      const result = await calculateEligibleToMissed(userId, currentDate);
      
      expect(result).toEqual({
        userId,
        updates: {
          status: { type: RecoveryStatusType.MISSED },
          lastCalculated: expect.any(Object)
        },
        reason: 'eligible → missed (deadline 2024-01-17 passed)'
      });
    });

    it('should return null when deadline has not passed', async () => {
      const currentDate = new Date('2024-01-16T09:00:00Z'); // Day before deadline
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 0,
            deadline: '2024-01-17',
            missedDate: '2024-01-15'
          },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      // Mock formatDateString to return the current date as string
      mockStreakUtils.formatDateString.mockReturnValue('2024-01-16');
      mockStreakUtils.isDateAfter.mockReturnValue(false); // Current date is not after deadline
      
      const result = await calculateEligibleToMissed(userId, currentDate);
      
      expect(result).toBeNull();
    });

    it('should return null when current date equals deadline (deadline day posts are valid)', async () => {
      const currentDate = new Date('2024-01-17T09:00:00Z'); // Deadline day itself
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 0,
            deadline: '2024-01-17', // Same as current date
            missedDate: '2024-01-15'
          },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      mockStreakUtils.formatDateString.mockReturnValue('2024-01-17');
      mockStreakUtils.isDateAfter.mockReturnValue(false); // Current date is NOT after deadline
      
      const result = await calculateEligibleToMissed(userId, currentDate);
      
      expect(result).toBeNull(); // No transition on deadline day
    });

    it('should return DBUpdate when current date is after deadline', async () => {
      const currentDate = new Date('2024-01-18T09:00:00Z'); // Day after deadline
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 0,
            deadline: '2024-01-17', // Before current date
            missedDate: '2024-01-15'
          },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      mockStreakUtils.formatDateString.mockReturnValue('2024-01-18');
      mockStreakUtils.isDateAfter.mockReturnValue(true); // Current date is after deadline
      
      const result = await calculateEligibleToMissed(userId, currentDate);
      
      expect(result).toEqual({
        userId,
        updates: {
          status: { type: RecoveryStatusType.MISSED },
          lastCalculated: expect.any(Object)
        },
        reason: 'eligible → missed (deadline 2024-01-17 passed)'
      });
    });

    it('should return null when user is not in eligible status', async () => {
      const currentDate = new Date('2024-01-18T09:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-17',
          lastCalculated: {} as any,
          status: { type: RecoveryStatusType.ON_STREAK },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      const result = await calculateEligibleToMissed(userId, currentDate);
      
      expect(result).toBeNull();
    });
  });

  describe('3. eligible → onStreak transition', () => {
    it('should return DBUpdate when user writes required number of posts', async () => {
      const postDate = new Date('2024-01-17T14:00:00Z'); // Wednesday afternoon in Seoul
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 0,
            deadline: '2024-01-17',
            missedDate: '2024-01-15'
          },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      // Mock that user has written 2 posts today
      mockStreakUtils.countPostsOnDate.mockResolvedValue(2);
      mockStreakUtils.formatDateString.mockReturnValue('2024-01-17');
      
      const result = await calculateEligibleToOnStreak(userId, postDate);
      
      expect(result).toEqual({
        userId,
        updates: {
          lastContributionDate: '2024-01-17',
          status: { type: RecoveryStatusType.ON_STREAK },
          lastCalculated: expect.any(Object)
        },
        reason: 'eligible → onStreak (recovery completed with 2 posts)'
      });
    });

    it('should return progress update DBUpdate when user has not written enough posts yet', async () => {
      const postDate = new Date('2024-01-17T14:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 0,
            deadline: '2024-01-17',
            missedDate: '2024-01-15'
          },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      // Mock that user has written only 1 post
      mockStreakUtils.countPostsOnDate.mockResolvedValue(1);
      
      const result = await calculateEligibleToOnStreak(userId, postDate);
      
      expect(result).toEqual({
        userId,
        updates: {
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 1,
            deadline: '2024-01-17',
            missedDate: '2024-01-15'
          },
          lastCalculated: expect.any(Object)
        },
        reason: 'eligible progress updated (1/2)'
      });
    });

    it('should return null when user is not in eligible status', async () => {
      const postDate = new Date('2024-01-17T14:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-17',
          lastCalculated: {} as any,
          status: { type: RecoveryStatusType.ON_STREAK },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      const result = await calculateEligibleToOnStreak(userId, postDate);
      
      expect(result).toBeNull();
    });

    it('should return null when postsRequired is missing', async () => {
      const postDate = new Date('2024-01-17T14:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            // Missing postsRequired
            currentPosts: 0,
            deadline: '2024-01-17',
            missedDate: '2024-01-15'
          },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      const result = await calculateEligibleToOnStreak(userId, postDate);
      
      expect(result).toBeNull();
    });
  });

  describe('4. missed → onStreak transition', () => {
    it('should return DBUpdate when user writes any post', async () => {
      const postDate = new Date('2024-01-18T14:00:00Z'); // Thursday afternoon in Seoul
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: { type: RecoveryStatusType.MISSED },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      mockStreakUtils.formatDateString.mockReturnValue('2024-01-18');
      
      const result = await calculateMissedToOnStreak(userId, postDate);
      
      expect(result).toEqual({
        userId,
        updates: {
          lastContributionDate: '2024-01-18',
          status: { type: RecoveryStatusType.ON_STREAK },
          lastCalculated: expect.any(Object)
        },
        reason: 'missed → onStreak (fresh start)'
      });
    });

    it('should return null when user is not in missed status', async () => {
      const postDate = new Date('2024-01-18T14:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-18',
          lastCalculated: {} as any,
          status: { type: RecoveryStatusType.ON_STREAK },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      const result = await calculateMissedToOnStreak(userId, postDate);
      
      expect(result).toBeNull();
    });
  });

  describe('Orchestrator functions', () => {
    describe('calculateMidnightTransitions', () => {
      it('should return onStreak → eligible update when applicable', async () => {
        const currentDate = new Date('2024-01-16T09:00:00Z');
        
        // Set up mocks for onStreak → eligible scenario
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {} as any,
          data: {
            lastContributionDate: '2024-01-13',
            lastCalculated: {} as any,
            status: { type: RecoveryStatusType.ON_STREAK },
            currentStreak: 0,
            longestStreak: 0
          }
        });
        
        mockStreakUtils.didUserMissYesterday.mockResolvedValue(true);
        mockStreakUtils.calculateRecoveryRequirement.mockReturnValue({
          postsRequired: 2,
          currentPosts: 0,
          deadline: '2024-01-17',
          missedDate: '2024-01-15'
        });
        
        const result = await calculateMidnightTransitions(userId, currentDate);
        
        expect(result).toEqual({
          userId,
          updates: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 2,
              currentPosts: 0,
              deadline: '2024-01-17',
              missedDate: '2024-01-15'
            },
            lastCalculated: expect.any(Object)
          },
          reason: 'onStreak → eligible (missed 2024-01-15)'
        });
      });

      it('should return eligible → missed update when onStreak transition not applicable', async () => {
        const currentDate = new Date('2024-01-18T09:00:00Z');
        
        // First call for onStreak → eligible (should fail)
        // Second call for eligible → missed (should succeed)
        mockStreakUtils.getOrCreateStreakInfo
          .mockResolvedValueOnce({
            doc: {} as any,
            data: {
              lastContributionDate: '2024-01-13',
              lastCalculated: {} as any,
              status: { type: RecoveryStatusType.ELIGIBLE, postsRequired: 2, currentPosts: 0, deadline: '2024-01-17', missedDate: '2024-01-15' },
              currentStreak: 0,
              longestStreak: 0
            }
          })
          .mockResolvedValueOnce({
            doc: {} as any,
            data: {
              lastContributionDate: '2024-01-13',
              lastCalculated: {} as any,
              status: { type: RecoveryStatusType.ELIGIBLE, postsRequired: 2, currentPosts: 0, deadline: '2024-01-17', missedDate: '2024-01-15' },
              currentStreak: 0,
              longestStreak: 0
            }
          });
        
        mockStreakUtils.formatDateString.mockReturnValue('2024-01-18');
        mockStreakUtils.isDateAfter.mockReturnValue(true); // Current date is after deadline
        
        const result = await calculateMidnightTransitions(userId, currentDate);
        
        expect(result).toEqual({
          userId,
          updates: {
            status: { type: RecoveryStatusType.MISSED },
            lastCalculated: expect.any(Object)
          },
          reason: 'eligible → missed (deadline 2024-01-17 passed)'
        });
      });

      it('should return null when no transitions apply', async () => {
        const currentDate = new Date('2024-01-16T09:00:00Z');
        
        // User already missed - no midnight transitions apply
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {} as any,
          data: {
            lastContributionDate: '2024-01-13',
            lastCalculated: {} as any,
            status: { type: RecoveryStatusType.MISSED },
            currentStreak: 0,
            longestStreak: 0
          }
        });
        
        const result = await calculateMidnightTransitions(userId, currentDate);
        
        expect(result).toBeNull();
      });
    });

    describe('calculatePostingTransitions', () => {
      it('should return eligible → onStreak update when recovery completed', async () => {
        const postDate = new Date('2024-01-17T14:00:00Z');
        
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {} as any,
          data: {
            lastContributionDate: '2024-01-13',
            lastCalculated: {} as any,
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 2,
              currentPosts: 0,
              deadline: '2024-01-17',
              missedDate: '2024-01-15'
            },
            currentStreak: 0,
            longestStreak: 0
          }
        });
        
        mockStreakUtils.countPostsOnDate.mockResolvedValue(2);
        mockStreakUtils.formatDateString.mockReturnValue('2024-01-17');
        
        const result = await calculatePostingTransitions(userId, postDate);
        
        expect(result).toEqual({
          userId,
          updates: {
            lastContributionDate: '2024-01-17',
            status: { type: RecoveryStatusType.ON_STREAK },
            lastCalculated: expect.any(Object)
          },
          reason: 'eligible → onStreak (recovery completed with 2 posts)'
        });
      });

      it('should return missed → onStreak update when eligible transition not applicable', async () => {
        const postDate = new Date('2024-01-18T14:00:00Z');
        
        // First call for eligible → onStreak (should fail)
        // Second call for missed → onStreak (should succeed)
        mockStreakUtils.getOrCreateStreakInfo
          .mockResolvedValueOnce({
            doc: {} as any,
            data: {
              lastContributionDate: '2024-01-13',
              lastCalculated: {} as any,
              status: { type: RecoveryStatusType.MISSED },
              currentStreak: 0,
              longestStreak: 0
            }
          })
          .mockResolvedValueOnce({
            doc: {} as any,
            data: {
              lastContributionDate: '2024-01-13',
              lastCalculated: {} as any,
              status: { type: RecoveryStatusType.MISSED },
              currentStreak: 0,
              longestStreak: 0
            }
          });
        
        mockStreakUtils.formatDateString.mockReturnValue('2024-01-18');
        
        const result = await calculatePostingTransitions(userId, postDate);
        
        expect(result).toEqual({
          userId,
          updates: {
            lastContributionDate: '2024-01-18',
            status: { type: RecoveryStatusType.ON_STREAK },
            lastCalculated: expect.any(Object)
          },
          reason: 'missed → onStreak (fresh start)'
        });
      });

      it('should return onStreak → onStreak update when user is already onStreak', async () => {
        const postDate = new Date('2024-01-17T14:00:00Z');
        
        // User already on streak - should get onStreak → onStreak transition (bug fix!)
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {} as any,
          data: {
            lastContributionDate: '2024-01-16',
            lastCalculated: {} as any,
            status: { type: RecoveryStatusType.ON_STREAK },
            currentStreak: 0,
            longestStreak: 0
          }
        });
        
        const result = await calculatePostingTransitions(userId, postDate);
        
        // Should return onStreak → onStreak transition, not null (this was the bug!)
        expect(result).not.toBeNull();
        expect(result?.reason).toBe('onStreak → onStreak (streak maintained)');
        expect(result?.updates.status?.type).toBe(RecoveryStatusType.ON_STREAK);
      });
    });
  });

  describe('Output-based testing examples', () => {
    it('should demonstrate output-based testing approach', async () => {
      // Example of how remaining tests should be refactored:
      // 1. Use calculate functions instead of handle functions
      // 2. Assert on returned DBUpdate objects
      // 3. Remove side effect testing (updateStreakInfo mocks)
      // 4. Focus on pure function outputs
      
      const currentDate = new Date('2024-01-16T09:00:00Z');
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: { type: RecoveryStatusType.ON_STREAK },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      mockStreakUtils.didUserMissYesterday.mockResolvedValue(true);
      mockStreakUtils.calculateRecoveryRequirement.mockReturnValue({
        postsRequired: 2,
        currentPosts: 0,
        deadline: '2024-01-17',
        missedDate: '2024-01-15'
      });
      
      const result = await calculateOnStreakToEligible(userId, currentDate);
      
      // Output-based assertion - testing what the function returns
      expect(result).toEqual({
        userId,
        updates: expect.objectContaining({
          status: expect.objectContaining({
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2
          })
        }),
        reason: expect.stringContaining('onStreak → eligible')
      });
    });
  });

  describe('Deadline behavior validation', () => {
    it('should validate that posts on deadline day do not trigger missed status', async () => {
      // Test scenario: User has until 2024-01-17 to recover
      // On 2024-01-17 (deadline day), they should still be eligible, not missed
      const deadlineDay = new Date('2024-01-17T23:59:00Z'); // Late on deadline day
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 0,
            deadline: '2024-01-17', // Deadline is today
            missedDate: '2024-01-15'
          },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      mockStreakUtils.formatDateString.mockReturnValue('2024-01-17');
      mockStreakUtils.isDateAfter.mockReturnValue(false); // Same day, not after
      
      const result = await calculateEligibleToMissed(userId, deadlineDay);
      
      // Should NOT transition to missed on deadline day itself
      expect(result).toBeNull();
    });

    it('should validate that posts after deadline day trigger missed status', async () => {
      // Test scenario: User missed the deadline, now it's the next day
      const dayAfterDeadline = new Date('2024-01-18T00:01:00Z'); // Just after deadline
      
      mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
        doc: {} as any,
        data: {
          lastContributionDate: '2024-01-13',
          lastCalculated: {} as any,
          status: {
            type: RecoveryStatusType.ELIGIBLE,
            postsRequired: 2,
            currentPosts: 0,
            deadline: '2024-01-17', // Deadline was yesterday
            missedDate: '2024-01-15'
          },
          currentStreak: 0,
          longestStreak: 0
        }
      });
      
      mockStreakUtils.formatDateString.mockReturnValue('2024-01-18');
      mockStreakUtils.isDateAfter.mockReturnValue(true); // Day after deadline
      
      const result = await calculateEligibleToMissed(userId, dayAfterDeadline);
      
      // Should transition to missed after deadline
      expect(result).toEqual({
        userId,
        updates: {
          status: { type: RecoveryStatusType.MISSED },
          lastCalculated: expect.any(Object)
        },
        reason: 'eligible → missed (deadline 2024-01-17 passed)'
      });
    });
  });

  describe('Bug Regression Tests', () => {
    describe('onStreak → onStreak transition bug fix', () => {
      // Regression test for the bug where onStreak users writing posts 
      // were not getting their streaks updated

      it('should handle onStreak user writing another post', async () => {
        const postDate = new Date('2024-01-15T10:00:00Z');
        const mockStreakInfo: StreakInfo = {
          lastContributionDate: '2024-01-14',
          lastCalculated: Timestamp.now(),
          status: {
            type: RecoveryStatusType.ON_STREAK
          },
          currentStreak: 5,
          longestStreak: 10
        };

        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {} as any,
          data: mockStreakInfo
        });
        
        mockStreakUtils.formatDateString.mockReturnValue('2024-01-15');

        const result = await calculateOnStreakToOnStreak(userId, postDate);

        // Should return a valid update, not null (this was the bug!)
        expect(result).not.toBeNull();
        expect(result?.reason).toBe('onStreak → onStreak (streak maintained)');
        expect(result?.updates.status?.type).toBe(RecoveryStatusType.ON_STREAK);
        expect(result?.updates.lastContributionDate).toBe('2024-01-15');
      });

      it('should process onStreak user through calculatePostingTransitions', async () => {
        const postDate = new Date('2024-01-15T10:00:00Z');
        const mockStreakInfo: StreakInfo = {
          lastContributionDate: '2024-01-14',
          lastCalculated: Timestamp.now(),
          status: {
            type: RecoveryStatusType.ON_STREAK
          },
          currentStreak: 5,
          longestStreak: 10
        };

        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {} as any,
          data: mockStreakInfo
        });
        
        mockStreakUtils.formatDateString.mockReturnValue('2024-01-15');

        const result = await calculatePostingTransitions(userId, postDate);

        // The orchestrator should route onStreak users to the onStreak → onStreak transition
        expect(result).not.toBeNull();
        expect(result?.reason).toBe('onStreak → onStreak (streak maintained)');
        expect(result?.updates.status?.type).toBe(RecoveryStatusType.ON_STREAK);
      });

      it('should process onStreak user through modern calculate pattern', async () => {
        const postDate = new Date('2024-01-15T10:00:00Z');
        const mockStreakInfo: StreakInfo = {
          lastContributionDate: '2024-01-14',
          lastCalculated: Timestamp.now(),
          status: {
            type: RecoveryStatusType.ON_STREAK
          },
          currentStreak: 5,
          longestStreak: 10
        };

        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {} as any,
          data: mockStreakInfo
        });
        
        mockStreakUtils.formatDateString.mockReturnValue('2024-01-15');
        mockStreakUtils.updateStreakInfo.mockResolvedValue(undefined);

        // Mock console.log to verify logging
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        // Test the modern pattern like in onPostingCreated.ts
        const dbUpdate = await calculatePostingTransitions(userId, postDate);
        if (dbUpdate) {
          await mockStreakUtils.updateStreakInfo(userId, dbUpdate.updates);
          console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`);
        }

        // Verify updateStreakInfo was called (proving the bug is fixed)
        expect(mockStreakUtils.updateStreakInfo).toHaveBeenCalled();
        
        // Verify logging occurred with the onStreak → onStreak message
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining(`[StateTransition] User ${userId}: onStreak → onStreak (streak maintained)`)
        );

        consoleSpy.mockRestore();
      });
    });
  });

  // The remaining tests in the original file would follow the same refactoring pattern:
  // - Use pure calculate functions instead of impure handle functions  
  // - Assert on DBUpdate return values instead of mocked side effects
  // - Test inputs and outputs rather than state changes
  // - Remove all updateStreakInfo.toHaveBeenCalledWith assertions
  // - Focus on what the function returns, not what it does internally
});