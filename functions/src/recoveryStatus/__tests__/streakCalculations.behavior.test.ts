import { describe, it, expect } from '@jest/globals';
import {
  calculateCurrentStreakPure,
  calculateLongestStreakPure,
  buildPostingDaysSet,
  PostingData
} from '../streakCalculations';

describe('Streak Calculations Behavior Tests - Pure Functions', () => {
  
  // Helper to create posting data
  const createPosting = (dateString: string): PostingData => ({
    createdAt: new Date(`${dateString}T10:00:00Z`),
    userId: 'test-user'
  });

  describe('Current Streak Calculation (Pure Function)', () => {
    describe('when user has consecutive working day posts', () => {
      it('calculates correct streak length', () => {
        const postingDays = new Set([
          '2024-01-19', // Friday (today)
          '2024-01-18', // Thursday
          '2024-01-17', // Wednesday
          '2024-01-16', // Tuesday
          '2024-01-15', // Monday
          // Gap here - no posting on 2024-01-12 (Friday)
          '2024-01-11', // Thursday
        ]);
        const currentDate = new Date('2024-01-19T10:00:00Z'); // Friday

        const result = calculateCurrentStreakPure(postingDays, currentDate);

        expect(result).toBe(5); // 5 consecutive working days
      });

      it('returns zero when user has no posts', () => {
        const postingDays = new Set<string>();
        const currentDate = new Date('2024-01-19T10:00:00Z');

        const result = calculateCurrentStreakPure(postingDays, currentDate);

        expect(result).toBe(0);
      });

      it('handles weekend correctly', () => {
        const postingDays = new Set([
          '2024-01-19', // Friday (last working day)
          '2024-01-18', // Thursday
        ]);
        const currentDate = new Date('2024-01-20T10:00:00Z'); // Saturday

        const result = calculateCurrentStreakPure(postingDays, currentDate);

        expect(result).toBe(2);
      });
    });

    describe('when user has gaps in posting history', () => {
      it('stops counting at first gap', () => {
        const postingDays = new Set([
          '2024-01-19', // Friday
          '2024-01-18', // Thursday
          // Gap: no post on 2024-01-17 (Wednesday)
          '2024-01-16', // Tuesday
          '2024-01-15', // Monday
        ]);
        const currentDate = new Date('2024-01-19T10:00:00Z');

        const result = calculateCurrentStreakPure(postingDays, currentDate);

        expect(result).toBe(2); // Only Friday and Thursday count
      });
    });
  });

  describe('Longest Streak Calculation (Pure Function)', () => {
    describe('when user has multiple streak periods', () => {
      it('finds the longest consecutive period', () => {
        const postingDays = [
          // First streak (3 days)
          '2024-01-01', // Monday
          '2024-01-02', // Tuesday
          '2024-01-03', // Wednesday
          
          // Gap (missing Thu, Fri)
          
          // Second streak (2 days)  
          '2024-01-08', // Monday
          '2024-01-09', // Tuesday
          
          // Gap (missing Wed, Thu, Fri)
          
          // Third streak (4 days) - this should be longest
          '2024-01-15', // Monday
          '2024-01-16', // Tuesday
          '2024-01-17', // Wednesday
          '2024-01-18', // Thursday
        ];

        const result = calculateLongestStreakPure(postingDays);

        expect(result).toBe(4); // The 4-day streak is longest
      });

      it('returns zero for empty posting history', () => {
        const result = calculateLongestStreakPure([]);

        expect(result).toBe(0);
      });

      it('handles single day streaks', () => {
        const postingDays = [
          '2024-01-15', // Monday
          '2024-01-17', // Wednesday
          '2024-01-19', // Friday
        ];

        const result = calculateLongestStreakPure(postingDays);

        expect(result).toBe(1); // Each isolated day is a streak of 1
      });
    });

    describe('when postings span weekends correctly', () => {
      it('counts continuous streaks across weekends', () => {
        const postingDays = [
          '2024-01-15', // Monday (week 1)
          '2024-01-16', // Tuesday (week 1)
          '2024-01-17', // Wednesday (week 1)
          '2024-01-18', // Thursday (week 1)
          '2024-01-19', // Friday (week 1)
          '2024-01-22', // Monday (week 2)
        ];

        const result = calculateLongestStreakPure(postingDays);

        expect(result).toBe(6); // Should count as continuous across weekend
      });
    });
  });

  describe('Posting Days Set Builder', () => {
    describe('when given posting data', () => {
      it('creates correct set of date strings', () => {
        const postings = [
          createPosting('2024-01-19'),
          createPosting('2024-01-18'),
          createPosting('2024-01-17'),
        ];

        const result = buildPostingDaysSet(postings);

        expect(result).toEqual(new Set([
          '2024-01-19',
          '2024-01-18',
          '2024-01-17'
        ]));
      });

      it('filters out invalid dates', () => {
        const postings = [
          createPosting('2024-01-19'),
          { createdAt: new Date('invalid'), userId: 'test-user' }, // Invalid date
          createPosting('2024-01-18'),
        ];

        const result = buildPostingDaysSet(postings);

        expect(result).toEqual(new Set([
          '2024-01-19',
          '2024-01-18'
        ]));
      });

      it('handles duplicate dates', () => {
        const postings = [
          createPosting('2024-01-19'),
          createPosting('2024-01-19'), // Duplicate
          createPosting('2024-01-18'),
        ];

        const result = buildPostingDaysSet(postings);

        expect(result).toEqual(new Set([
          '2024-01-19',
          '2024-01-18'
        ]));
      });
    });
  });

  describe('Edge Cases', () => {
    describe('when dealing with timezone boundaries', () => {
      it('correctly processes dates from different UTC times', () => {
        const postings = [
          { createdAt: new Date('2024-01-18T15:30:00Z'), userId: 'test-user' }, // Different UTC time
          { createdAt: new Date('2024-01-17T16:00:00Z'), userId: 'test-user' }, // Different UTC time
        ];

        const result = buildPostingDaysSet(postings);

        expect(result.size).toBeGreaterThanOrEqual(1); // Should handle timezone conversion
      });
    });

    describe('when given invalid inputs', () => {
      it('handles invalid current date gracefully', () => {
        const postingDays = new Set(['2024-01-19']);
        const invalidDate = new Date('invalid');

        expect(() => calculateCurrentStreakPure(postingDays, invalidDate))
          .toThrow(); // Should throw for invalid date
      });

      it('handles empty posting days set', () => {
        const postingDays = new Set<string>();
        const currentDate = new Date('2024-01-19T10:00:00Z');

        const result = calculateCurrentStreakPure(postingDays, currentDate);

        expect(result).toBe(0);
      });
    });
  });

  describe('Real-World Scenarios', () => {
    describe('when simulating actual user behavior', () => {
      it('handles mixed working and non-working days correctly', () => {
        const postingDays = new Set([
          '2024-01-19', // Friday (working day)
          '2024-01-18', // Thursday (working day)
          '2024-01-17', // Wednesday (working day)
          '2024-01-16', // Tuesday (working day)
          '2024-01-13', // Saturday (non-working, should not break streak)
          '2024-01-12', // Friday (working day)
        ]);
        const currentDate = new Date('2024-01-19T10:00:00Z');

        const result = calculateCurrentStreakPure(postingDays, currentDate);

        expect(result).toBe(4); // Should count 4 consecutive working days (Fri, Thu, Wed, Tue)
      });

      it('calculates streak correctly for user who posts every day', () => {
        const postingDays = [
          '2024-01-15', // Monday
          '2024-01-16', // Tuesday
          '2024-01-17', // Wednesday
          '2024-01-18', // Thursday
          '2024-01-19', // Friday
          '2024-01-22', // Monday
          '2024-01-23', // Tuesday
          '2024-01-24', // Wednesday
        ];

        const result = calculateLongestStreakPure(postingDays);

        expect(result).toBe(8); // Should count all consecutive working days
      });
    });

    describe('when handling month boundaries', () => {
      it('correctly processes streaks across month changes', () => {
        const postingDays = [
          '2024-01-29', // Monday
          '2024-01-30', // Tuesday
          '2024-01-31', // Wednesday
          '2024-02-01', // Thursday
          '2024-02-02', // Friday
        ];

        const result = calculateLongestStreakPure(postingDays);

        expect(result).toBe(5); // Should count across month boundary
      });
    });
  });
});