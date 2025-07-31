import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import {
  calculateOnStreakToEligible,
  calculateEligibleToMissed,
  calculateEligibleToOnStreak,
  calculateMissedToOnStreak,
  calculatePostingTransitions,
  calculateMidnightTransitions
} from '../stateTransitions';
import { RecoveryStatusType } from '../StreakInfo';

// Mock dependencies
jest.mock('../../shared/calendar');
jest.mock('../streakUtils');
jest.mock('../transitionHelpers');
jest.mock('../streakCalculations');

const mockCalendar = require('../../shared/calendar');
const mockStreakUtils = require('../streakUtils');
const mockTransitionHelpers = require('../transitionHelpers');

describe('State Transitions Behavior Tests', () => {
  const testUserId = 'user123';
  const testDate = new Date('2024-01-16T10:00:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default helper mocks
    mockTransitionHelpers.validateUserState.mockReturnValue(true);
    mockTransitionHelpers.createBaseUpdate.mockReturnValue({
      userId: testUserId,
      reason: 'test transition',
      updates: { lastCalculated: Timestamp.now() }
    });
    mockTransitionHelpers.addStreakCalculations.mockImplementation(
      async (userId: string, updates: any) => ({ ...updates, currentStreak: 1, longestStreak: 1 })
    );
  });

  describe('User On Streak', () => {
    describe('when user misses a working day', () => {
      it('transitions to eligible for recovery', async () => {
        // Setup: User is on streak but missed yesterday
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: { type: RecoveryStatusType.ON_STREAK },
            currentStreak: 5,
            longestStreak: 10
          }
        });
        mockCalendar.didUserMissYesterday.mockResolvedValue(true);
        mockCalendar.calculateRecoveryRequirement.mockReturnValue({
          postsRequired: 2,
          currentPosts: 0,
          deadline: '2024-01-17',
          missedDate: '2024-01-15'
        });

        const result = await calculateOnStreakToEligible(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 2,
              currentPosts: 0,
              deadline: '2024-01-17',
              missedDate: '2024-01-15'
            }
          }
        });
      });

      it('stays on streak when no working day was missed', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: { status: { type: RecoveryStatusType.ON_STREAK } }
        });
        mockCalendar.didUserMissYesterday.mockResolvedValue(false);

        const result = await calculateOnStreakToEligible(testUserId, testDate);

        expect(result).toBeNull();
      });
    });
  });

  describe('User Eligible for Recovery', () => {
    describe('when recovery deadline passes', () => {
      it('transitions to missed status', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              deadline: '2024-01-15'
            }
          }
        });
        mockCalendar.hasDeadlinePassed.mockReturnValue(true);

        const result = await calculateEligibleToMissed(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.MISSED }
          }
        });
      });

      it('remains eligible when deadline has not passed', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              deadline: '2024-01-17'
            }
          }
        });
        mockCalendar.hasDeadlinePassed.mockReturnValue(false);

        const result = await calculateEligibleToMissed(testUserId, testDate);

        expect(result).toBeNull();
      });
    });

    describe('when user posts for recovery', () => {
      it('transitions to on-streak after meeting requirement', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 2,
              currentPosts: 1
            }
          }
        });
        mockCalendar.countSeoulDatePosts.mockResolvedValue(2);
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-16');

        const result = await calculateEligibleToOnStreak(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK },
            lastContributionDate: '2024-01-16'
          }
        });
      });

      it('updates progress when requirement not yet met', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 2,
              currentPosts: 0
            }
          }
        });
        mockCalendar.countSeoulDatePosts.mockResolvedValue(1);

        const result = await calculateEligibleToOnStreak(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              currentPosts: 1
            }
          }
        });
      });
    });
  });

  describe('User Missed Recovery', () => {
    describe('when user posts after missing recovery', () => {
      it('starts fresh streak', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: { status: { type: RecoveryStatusType.MISSED } }
        });
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-16');

        const result = await calculateMissedToOnStreak(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK },
            lastContributionDate: '2024-01-16'
          }
        });
      });
    });
  });

  describe('Posting Transitions Orchestration', () => {
    describe('when user posts while eligible', () => {
      it('processes eligible to on-streak transition', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 2
            }
          }
        });
        mockCalendar.countSeoulDatePosts.mockResolvedValue(2);
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-16');

        const result = await calculatePostingTransitions(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK }
          }
        });
      });
    });

    describe('when user posts while missed', () => {
      it('processes missed to on-streak transition', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: { status: { type: RecoveryStatusType.MISSED } }
        });
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-16');

        const result = await calculatePostingTransitions(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK }
          }
        });
      });
    });

    describe('when user data is unavailable', () => {
      it('returns null without processing', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: null
        });

        const result = await calculatePostingTransitions(testUserId, testDate);

        expect(result).toBeNull();
      });
    });
  });

  describe('Midnight Transitions Orchestration', () => {
    describe('when user on streak missed yesterday', () => {
      it('processes on-streak to eligible transition', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: { status: { type: RecoveryStatusType.ON_STREAK } }
        });
        mockCalendar.didUserMissYesterday.mockResolvedValue(true);
        mockCalendar.calculateRecoveryRequirement.mockReturnValue({
          postsRequired: 2,
          currentPosts: 0,
          deadline: '2024-01-17',
          missedDate: '2024-01-15'
        });

        const result = await calculateMidnightTransitions(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 2
            }
          }
        });
      });
    });

    describe('when eligible user deadline passes', () => {
      it('processes eligible to missed transition', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              deadline: '2024-01-15'
            }
          }
        });
        mockCalendar.hasDeadlinePassed.mockReturnValue(true);

        const result = await calculateMidnightTransitions(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.MISSED }
          }
        });
      });
    });

    describe('when no state transitions are needed', () => {
      it('returns null', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: { status: { type: RecoveryStatusType.ON_STREAK } }
        });
        mockCalendar.didUserMissYesterday.mockResolvedValue(false);

        const result = await calculateMidnightTransitions(testUserId, testDate);

        expect(result).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    describe('when streak info cannot be retrieved', () => {
      it('handles database errors gracefully', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockRejectedValue(
          new Error('Database connection failed')
        );

        await expect(
          calculatePostingTransitions(testUserId, testDate)
        ).rejects.toThrow('Database connection failed');
      });
    });

    describe('when calendar operations fail', () => {
      it('propagates calendar errors', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: { status: { type: RecoveryStatusType.ON_STREAK } }
        });
        mockCalendar.didUserMissYesterday.mockRejectedValue(
          new Error('Calendar service unavailable')
        );

        await expect(
          calculateMidnightTransitions(testUserId, testDate)
        ).rejects.toThrow('Calendar service unavailable');
      });
    });
  });
});