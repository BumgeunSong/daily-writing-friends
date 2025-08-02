/**
 * @deprecated LEGACY TESTS - DO NOT USE
 * 
 * These tests were written for the old streak recovery logic and are no longer valid.
 * They are kept for reference only. 
 * 
 * Use stateTransitions.newspec.test.ts for current behavior verification.
 * 
 * TODO: Remove this file after confirming new implementation is stable.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import {
  calculateOnStreakToEligible,
  calculateEligibleToMissed,
  calculateEligibleToOnStreak,
  calculateMissedToOnStreak,
  calculatePostingTransitions,
  calculateMidnightTransitions,
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
      updates: { lastCalculated: Timestamp.now() },
    });
    mockTransitionHelpers.addStreakCalculations.mockImplementation(
      async (userId: string, updates: any) => ({ ...updates, currentStreak: 1, longestStreak: 1 }),
    );
    mockTransitionHelpers.calculateRestoredStreak.mockImplementation(
      (originalStreak: number, recoveryDate: Date) => {
        // Mock logic: if recovery date is Saturday (6) or Sunday (0), don't add 1
        const dayOfWeek = recoveryDate.getDay();
        return originalStreak + (dayOfWeek >= 1 && dayOfWeek <= 5 ? 1 : 0);
      },
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
            longestStreak: 10,
          },
        });
        mockCalendar.didUserMissYesterday.mockResolvedValue(true);
        mockCalendar.calculateRecoveryRequirement.mockReturnValue({
          postsRequired: 2,
          currentPosts: 0,
          deadline: '2024-01-17',
          missedDate: '2024-01-15',
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
              missedDate: '2024-01-15',
              originalStreak: 5, // Should store the original streak value
            },
          },
        });
      });

      it('stores original streak when transitioning to eligible', async () => {
        // Setup: User has a high streak value
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: { type: RecoveryStatusType.ON_STREAK },
            currentStreak: 15,
            longestStreak: 20,
          },
        });
        mockCalendar.didUserMissYesterday.mockResolvedValue(true);
        mockCalendar.calculateRecoveryRequirement.mockReturnValue({
          postsRequired: 1,
          currentPosts: 0,
          deadline: '2024-01-17',
          missedDate: '2024-01-15',
        });

        const result = await calculateOnStreakToEligible(testUserId, testDate);

        expect(result?.updates.status).toMatchObject({
          type: RecoveryStatusType.ELIGIBLE,
          originalStreak: 15, // Should preserve the original streak
        });
      });

      it('stays on streak when no working day was missed', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: { status: { type: RecoveryStatusType.ON_STREAK } },
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
              deadline: '2024-01-15',
            },
          },
        });
        mockCalendar.hasDeadlinePassed.mockReturnValue(true);

        const result = await calculateEligibleToMissed(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.MISSED },
          },
        });
      });

      it('remains eligible when deadline has not passed', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              deadline: '2024-01-17',
            },
          },
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
              currentPosts: 1,
            },
          },
        });
        mockCalendar.countSeoulDatePosts.mockResolvedValue(2);
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-16');

        const result = await calculateEligibleToOnStreak(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK },
            lastContributionDate: '2024-01-16',
          },
        });
      });

      it('restores original streak when completing recovery', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 2,
              currentPosts: 1,
              originalStreak: 10, // Original streak before transition
            },
            longestStreak: 15,
          },
        });
        mockCalendar.countSeoulDatePosts.mockResolvedValue(2);
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-16');
        mockCalendar.isSeoulWorkingDay.mockReturnValue(true); // Tuesday is a working day

        const result = await calculateEligibleToOnStreak(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK },
            lastContributionDate: '2024-01-16',
            currentStreak: 11, // originalStreak (10) + 1 for working day recovery
            longestStreak: 15, // Should remain the same since 11 < 15
          },
        });
      });

      it('updates longest streak when restored streak exceeds previous record', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 1,
              currentPosts: 0,
              originalStreak: 20, // High original streak
            },
            longestStreak: 15, // Previous record
          },
        });
        mockCalendar.countSeoulDatePosts.mockResolvedValue(1);
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-16');
        mockCalendar.isSeoulWorkingDay.mockReturnValue(true); // Tuesday is a working day

        const result = await calculateEligibleToOnStreak(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK },
            lastContributionDate: '2024-01-16',
            currentStreak: 21, // originalStreak (20) + 1 for working day recovery
            longestStreak: 21, // Should update to new record
          },
        });
      });

      it('handles missing originalStreak gracefully', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 1,
              currentPosts: 0,
              // originalStreak is missing
            },
            longestStreak: 10,
          },
        });
        mockCalendar.countSeoulDatePosts.mockResolvedValue(1);
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-16');
        mockCalendar.isSeoulWorkingDay.mockReturnValue(true); // Tuesday is a working day

        const result = await calculateEligibleToOnStreak(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK },
            lastContributionDate: '2024-01-16',
            currentStreak: 1, // Should default to 0 + 1 for working day recovery
            longestStreak: 10, // Should remain the same
          },
        });
      });

      it('restores streak correctly when recovery day is a working day', async () => {
        // Test with Wednesday (working day)
        const wednesdayDate = new Date('2024-01-17T10:00:00Z'); // Wednesday
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 2,
              currentPosts: 1,
              originalStreak: 10,
            },
            longestStreak: 15,
          },
        });
        mockCalendar.countSeoulDatePosts.mockResolvedValue(2);
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-17');
        mockCalendar.isSeoulWorkingDay.mockReturnValue(true); // Wednesday is a working day

        const result = await calculateEligibleToOnStreak(testUserId, wednesdayDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK },
            lastContributionDate: '2024-01-17',
            currentStreak: 11, // originalStreak (10) + 1 for working day recovery
            longestStreak: 15, // Should remain the same since 11 < 15
          },
        });
      });

      it('restores streak correctly when recovery day is not a working day', async () => {
        // Test with Saturday (non-working day)
        const saturdayDate = new Date('2024-01-20T10:00:00Z'); // Saturday
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 1,
              currentPosts: 0,
              originalStreak: 10,
            },
            longestStreak: 15,
          },
        });
        mockCalendar.countSeoulDatePosts.mockResolvedValue(1);
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-20');
        mockCalendar.isSeoulWorkingDay.mockReturnValue(false); // Saturday is not a working day

        const result = await calculateEligibleToOnStreak(testUserId, saturdayDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK },
            lastContributionDate: '2024-01-20',
            currentStreak: 10, // originalStreak (10) + 0 for non-working day recovery
            longestStreak: 15, // Should remain the same since 10 < 15
          },
        });
      });

      it('updates longest streak when restored streak exceeds previous record on working day', async () => {
        const wednesdayDate = new Date('2024-01-17T10:00:00Z'); // Wednesday
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 2,
              currentPosts: 1,
              originalStreak: 20, // High original streak
            },
            longestStreak: 15, // Previous record
          },
        });
        mockCalendar.countSeoulDatePosts.mockResolvedValue(2);
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-17');
        mockCalendar.isSeoulWorkingDay.mockReturnValue(true); // Wednesday is a working day

        const result = await calculateEligibleToOnStreak(testUserId, wednesdayDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK },
            lastContributionDate: '2024-01-17',
            currentStreak: 21, // originalStreak (20) + 1 for working day recovery
            longestStreak: 21, // Should update to new record
          },
        });
      });

      it('updates longest streak when restored streak exceeds previous record on non-working day', async () => {
        const saturdayDate = new Date('2024-01-20T10:00:00Z'); // Saturday
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 1,
              currentPosts: 0,
              originalStreak: 20, // High original streak
            },
            longestStreak: 15, // Previous record
          },
        });
        mockCalendar.countSeoulDatePosts.mockResolvedValue(1);
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-20');
        mockCalendar.isSeoulWorkingDay.mockReturnValue(false); // Saturday is not a working day

        const result = await calculateEligibleToOnStreak(testUserId, saturdayDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK },
            lastContributionDate: '2024-01-20',
            currentStreak: 20, // originalStreak (20) + 0 for non-working day recovery
            longestStreak: 20, // Should update to new record
          },
        });
      });

      it('updates progress when requirement not yet met', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 2,
              currentPosts: 0,
            },
          },
        });
        mockCalendar.countSeoulDatePosts.mockResolvedValue(1);

        const result = await calculateEligibleToOnStreak(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              currentPosts: 1,
            },
          },
        });
      });
    });
  });

  describe('User Missed Recovery', () => {
    describe('when user posts after missing recovery', () => {
      it('starts fresh streak', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: { status: { type: RecoveryStatusType.MISSED } },
        });
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-16');

        const result = await calculateMissedToOnStreak(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK },
            lastContributionDate: '2024-01-16',
          },
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
              postsRequired: 2,
            },
          },
        });
        mockCalendar.countSeoulDatePosts.mockResolvedValue(2);
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-16');

        const result = await calculatePostingTransitions(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK },
          },
        });
      });
    });

    describe('when user posts while missed', () => {
      it('processes missed to on-streak transition', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: { status: { type: RecoveryStatusType.MISSED } },
        });
        mockCalendar.formatSeoulDate.mockReturnValue('2024-01-16');

        const result = await calculatePostingTransitions(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.ON_STREAK },
          },
        });
      });
    });

    describe('when user data is unavailable', () => {
      it('returns null without processing', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: null,
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
          data: { status: { type: RecoveryStatusType.ON_STREAK } },
        });
        mockCalendar.didUserMissYesterday.mockResolvedValue(true);
        mockCalendar.calculateRecoveryRequirement.mockReturnValue({
          postsRequired: 2,
          currentPosts: 0,
          deadline: '2024-01-17',
          missedDate: '2024-01-15',
        });

        const result = await calculateMidnightTransitions(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: {
              type: RecoveryStatusType.ELIGIBLE,
              postsRequired: 2,
            },
          },
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
              deadline: '2024-01-15',
            },
          },
        });
        mockCalendar.hasDeadlinePassed.mockReturnValue(true);

        const result = await calculateMidnightTransitions(testUserId, testDate);

        expect(result).toMatchObject({
          userId: testUserId,
          updates: {
            status: { type: RecoveryStatusType.MISSED },
          },
        });
      });
    });

    describe('when no state transitions are needed', () => {
      it('returns null', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: { status: { type: RecoveryStatusType.ON_STREAK } },
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
          new Error('Database connection failed'),
        );

        await expect(calculatePostingTransitions(testUserId, testDate)).rejects.toThrow(
          'Database connection failed',
        );
      });
    });

    describe('when calendar operations fail', () => {
      it('propagates calendar errors', async () => {
        mockStreakUtils.getOrCreateStreakInfo.mockResolvedValue({
          doc: {},
          data: { status: { type: RecoveryStatusType.ON_STREAK } },
        });
        mockCalendar.didUserMissYesterday.mockRejectedValue(
          new Error('Calendar service unavailable'),
        );

        await expect(calculateMidnightTransitions(testUserId, testDate)).rejects.toThrow(
          'Calendar service unavailable',
        );
      });
    });
  });
});
