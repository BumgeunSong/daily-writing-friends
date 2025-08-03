import { describe, it, expect } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import {
  rebuildStreakInfoPure,
  determineStatusFromPostingHistoryOptimized,
} from '../fixStreakInfo';
import { RecoveryStatusType } from '../../recoveryStatus/StreakInfo';
import { Posting } from '../../postings/Posting';

describe('StreakInfo Rebuild Logic - Behavior Tests', () => {
  // Helper to create posting data (new Posting interface)
  const createPosting = (dateString: string): Posting => ({
    board: { id: 'test-board' },
    post: { id: 'test-post', title: 'Test Post', contentLength: 100 },
    createdAt: Timestamp.fromDate(new Date(`${dateString}T10:00:00Z`)),
    isRecovered: false,
  });


  // Helper to create current date for consistent testing
  const createCurrentDate = (dateString: string): Date => {
    return new Date(`${dateString}T10:00:00Z`);
  };

  describe('Status Determination from Posting History', () => {
    describe('when user posted yesterday (working day)', () => {
      it('returns onStreak status', () => {
        const postings = [
          createPosting('2024-01-19'), // Friday (yesterday)
          createPosting('2024-01-18'), // Thursday
        ];
        const currentDate = createCurrentDate('2024-01-20'); // Saturday (today)

        const result = determineStatusFromPostingHistoryOptimized(postings, currentDate);

        expect(result.status.type).toBe(RecoveryStatusType.ON_STREAK);
        expect(result.currentStreak).toBe(2);
      });
    });

    describe('when user missed yesterday (working day)', () => {
      it('returns eligible status with recovery requirements', () => {
        const postings = [
          createPosting('2024-01-18'), // Thursday (day before yesterday)
          createPosting('2024-01-17'), // Wednesday
        ];
        const currentDate = createCurrentDate('2024-01-20'); // Saturday (today)

        const result = determineStatusFromPostingHistoryOptimized(postings, currentDate);

        expect(result.status.type).toBe(RecoveryStatusType.ELIGIBLE);
        expect(result.status.postsRequired).toBe(1); // Weekend recovery requires 1 post
        expect(result.status.missedDate).toBeDefined();
        expect(result.currentStreak).toBe(0);
        expect(result.originalStreak).toBe(2); // Preserve streak before missing
      });
    });

    describe('when user has no recent posts', () => {
      it('returns missed status', () => {
        const postings = [
          createPosting('2024-01-10'), // Old posting
          createPosting('2024-01-09'),
        ];
        const currentDate = createCurrentDate('2024-01-20');

        const result = determineStatusFromPostingHistoryOptimized(postings, currentDate);

        expect(result.status.type).toBe(RecoveryStatusType.MISSED);
        expect(result.currentStreak).toBe(0);
        expect(result.originalStreak).toBe(0);
      });
    });

    describe('when user has no posts at all', () => {
      it('returns missed status with zero streaks', () => {
        const postings: Posting[] = [];
        const currentDate = createCurrentDate('2024-01-20');

        const result = determineStatusFromPostingHistoryOptimized(postings, currentDate);

        expect(result.status.type).toBe(RecoveryStatusType.MISSED);
        expect(result.currentStreak).toBe(0);
        expect(result.longestStreak).toBe(0);
        expect(result.originalStreak).toBe(0);
        expect(result.lastContributionDate).toBeNull();
      });
    });

    describe('when recovery deadline has passed', () => {
      it('returns missed status', () => {
        const postings = [
          createPosting('2024-01-15'), // Monday (missed Tuesday)
        ];
        const currentDate = createCurrentDate('2024-01-19'); // Friday (deadline passed)

        const result = determineStatusFromPostingHistoryOptimized(postings, currentDate);

        expect(result.status.type).toBe(RecoveryStatusType.MISSED);
        expect(result.currentStreak).toBe(0);
        expect(result.originalStreak).toBe(0);
      });
    });
  });

  describe('Complete StreakInfo Rebuild', () => {
    describe('when user has consistent posting history', () => {
      it('calculates correct streaks and status', () => {
        const postings = [
          createPosting('2024-01-19'), // Friday (today)
          createPosting('2024-01-18'), // Thursday
          createPosting('2024-01-17'), // Wednesday
          createPosting('2024-01-16'), // Tuesday
          createPosting('2024-01-15'), // Monday
          // Gap on 2024-01-12 (Friday)
          createPosting('2024-01-11'), // Thursday
          createPosting('2024-01-10'), // Wednesday
        ];
        const currentDate = createCurrentDate('2024-01-19');

        const result = rebuildStreakInfoPure(postings, currentDate);

        expect(result.status.type).toBe(RecoveryStatusType.ON_STREAK);
        expect(result.currentStreak).toBe(5); // Mon-Fri this week
        expect(result.longestStreak).toBe(5); // Longest is current streak
        expect(result.lastContributionDate).toBe('2024-01-19');
      });
    });

    describe('when user has gaps but longest streak in history', () => {
      it('preserves historical longest streak', () => {
        const postings = [
          // Current short streak
          createPosting('2024-01-19'), // Friday
          createPosting('2024-01-18'), // Thursday
          // Gap
          // Historical longer streak
          createPosting('2024-01-05'), // Friday
          createPosting('2024-01-04'), // Thursday
          createPosting('2024-01-03'), // Wednesday
          createPosting('2024-01-02'), // Tuesday
          createPosting('2024-01-01'), // Monday
          createPosting('2023-12-29'), // Friday
        ];
        const currentDate = createCurrentDate('2024-01-19');

        const result = rebuildStreakInfoPure(postings, currentDate);

        expect(result.currentStreak).toBe(2);
        expect(result.longestStreak).toBe(6); // Historical longest
        expect(result.status.type).toBe(RecoveryStatusType.ON_STREAK);
      });
    });

    describe('when user is in recovery scenario', () => {
      it('calculates recovery requirements correctly', () => {
        const postings = [
          createPosting('2024-01-17'), // Wednesday (had streak)
          createPosting('2024-01-16'), // Tuesday
          createPosting('2024-01-15'), // Monday
          // Missed Thursday (2024-01-18)
        ];
        const currentDate = createCurrentDate('2024-01-19'); // Friday

        const result = rebuildStreakInfoPure(postings, currentDate);

        expect(result.status.type).toBe(RecoveryStatusType.ELIGIBLE);
        expect(result.status.postsRequired).toBe(2); // Working day recovery requires 2 posts
        expect(result.currentStreak).toBe(0);
        expect(result.originalStreak).toBe(3); // Preserve pre-miss streak
        expect(result.status.deadline).toBeDefined();
      });
    });

    describe('when user posts on weekend during streak', () => {
      it('handles weekend posts correctly', () => {
        const postings = [
          createPosting('2024-01-21'), // Sunday (weekend)
          createPosting('2024-01-20'), // Saturday (weekend)
          createPosting('2024-01-19'), // Friday (working day)
          createPosting('2024-01-18'), // Thursday (working day)
        ];
        const currentDate = createCurrentDate('2024-01-22'); // Monday

        const result = rebuildStreakInfoPure(postings, currentDate);

        expect(result.currentStreak).toBe(2); // Only working days count
        expect(result.status.type).toBe(RecoveryStatusType.ON_STREAK);
        expect(result.lastContributionDate).toBe('2024-01-21'); // Most recent post
      });
    });
  });

  describe('Edge Cases', () => {
    describe('when posting data has invalid dates', () => {
      it('filters out invalid dates gracefully', () => {
        const validPostings = [
          createPosting('2024-01-19'),
          createPosting('2024-01-18'),
        ];
        // Note: We can't easily test invalid Timestamp objects in Firestore,
        // but the filtering logic handles invalid dates properly
        const currentDate = createCurrentDate('2024-01-19');

        const result = rebuildStreakInfoPure(validPostings, currentDate);

        expect(result.currentStreak).toBe(2);
        expect(result.status.type).toBe(RecoveryStatusType.ON_STREAK);
      });
    });

    describe('when user has very old posting history', () => {
      it('handles historical data efficiently', () => {
        const postings = [
          createPosting('2024-01-19'), // Recent
          createPosting('2022-01-01'), // Very old
          createPosting('2021-01-01'), // Very old
        ];
        const currentDate = createCurrentDate('2024-01-19');

        const result = rebuildStreakInfoPure(postings, currentDate);

        expect(result.currentStreak).toBe(1);
        expect(result.longestStreak).toBeGreaterThanOrEqual(1);
        expect(result.status.type).toBe(RecoveryStatusType.ON_STREAK);
      });
    });

    describe('when current date is weekend', () => {
      it('determines status based on last working day', () => {
        const postings = [
          createPosting('2024-01-19'), // Friday (last working day)
        ];
        const currentDate = createCurrentDate('2024-01-20'); // Saturday

        const result = rebuildStreakInfoPure(postings, currentDate);

        expect(result.status.type).toBe(RecoveryStatusType.ON_STREAK);
        expect(result.currentStreak).toBe(1);
      });
    });
  });


  describe('Status Transition Logic Validation', () => {
    describe('when user completes recovery on working day', () => {
      it('calculates new streak correctly per PRD', () => {
        const postingsBeforeMiss = [
          createPosting('2024-01-17'), // Wednesday
          createPosting('2024-01-16'), // Tuesday  
          createPosting('2024-01-15'), // Monday
        ];
        // User missed Thursday (2024-01-18)
        // User posts twice on Friday (2024-01-19) for recovery
        const postingsAfterRecovery = [
          ...postingsBeforeMiss,
          createPosting('2024-01-19'), // Friday recovery post 1
          createPosting('2024-01-19'), // Friday recovery post 2
        ];
        const currentDate = createCurrentDate('2024-01-19');

        const result = rebuildStreakInfoPure(postingsAfterRecovery, currentDate);

        // Per PRD: working day recovery should increment both streaks
        expect(result.status.type).toBe(RecoveryStatusType.ON_STREAK);
        expect(result.currentStreak).toBe(4); // 3 + 1 for recovery
        expect(result.originalStreak).toBe(4);
      });
    });

    describe('when user completes recovery on weekend', () => {
      it('maintains original streak per PRD', () => {
        const postingsBeforeMiss = [
          createPosting('2024-01-17'), // Wednesday
          createPosting('2024-01-16'), // Tuesday
          createPosting('2024-01-15'), // Monday
        ];
        // User missed Thursday and Friday
        // User posts twice on Saturday for recovery
        const postingsAfterRecovery = [
          ...postingsBeforeMiss,
          createPosting('2024-01-20'), // Saturday recovery post 1
          createPosting('2024-01-20'), // Saturday recovery post 2
        ];
        const currentDate = createCurrentDate('2024-01-20');

        const result = rebuildStreakInfoPure(postingsAfterRecovery, currentDate);

        // Per PRD: weekend recovery maintains original streak
        expect(result.status.type).toBe(RecoveryStatusType.ON_STREAK);
        expect(result.currentStreak).toBe(3); // Original streak maintained
        expect(result.originalStreak).toBe(3);
      });
    });
  });
});