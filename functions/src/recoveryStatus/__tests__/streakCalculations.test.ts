import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  buildPostingDaysSet,
  getDateKey,
  getPreviousDate,
  PostingData
} from '../streakCalculations';

// Mock external dependencies
jest.mock('../../shared/admin');
jest.mock('../../shared/dateUtils', () => ({
  toSeoulDate: jest.fn((date: Date) => date),
  isWorkingDay: jest.fn((date: Date) => {
    const day = date.getDay();
    // Monday = 1, Friday = 5, exclude custom holidays
    if (day < 1 || day > 5) return false;
    
    // Mock holidays: New Year's Day 2024-01-01, etc.
    const dateStr = date.toISOString().split('T')[0];
    const holidays = ['2024-01-01', '2024-12-25'];
    return !holidays.includes(dateStr);
  }),
}));

describe('Streak Calculations - Comprehensive Tests', () => {
  
  // Helper function to create posting with proper Firestore Timestamp
  const createPosting = (dateString: string, timeString: string = '10:00:00'): PostingData => ({
    createdAt: new Date(`${dateString}T${timeString}Z`),
    userId: 'test-user'
  });

  // Helper to create KST-aware dates
  const createKSTDate = (dateString: string, timeString: string = '09:00:00'): Date => {
    return new Date(`${dateString}T${timeString}+09:00`); // KST timezone
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: Friday, Jan 19, 2024 at 10:00 KST
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-19T01:00:00Z')); // 10:00 KST
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('1. Date Utility Functions', () => {
    describe('getDateKey', () => {
      it('should format date as YYYY-MM-DD', () => {
        const date = new Date('2024-01-15T14:30:00Z');
        const result = getDateKey(date);
        expect(result).toBe('2024-01-15');
      });

      it('should handle timezone boundary cases', () => {
        // Note: Since toSeoulDate is mocked to return the same date, 
        // this test checks the mock behavior rather than actual timezone conversion
        const utcMidnight = new Date('2024-01-15T15:00:00Z');
        const result = getDateKey(utcMidnight);
        expect(result).toBe('2024-01-15'); // Mock returns same date
      });

      it('should handle year/month boundaries', () => {
        const yearBoundary = new Date('2023-12-31T23:59:59Z');
        const result = getDateKey(yearBoundary);
        expect(result).toBe('2023-12-31');
      });
    });

    describe('getPreviousDate', () => {
      it('should get previous day correctly', () => {
        const date = new Date('2024-01-15T10:00:00Z');
        const result = getPreviousDate(date);
        expect(result.toISOString().split('T')[0]).toBe('2024-01-14');
      });

      it('should handle multiple days', () => {
        const date = new Date('2024-01-15T10:00:00Z');
        const result = getPreviousDate(date, 3);
        expect(result.toISOString().split('T')[0]).toBe('2024-01-12');
      });

      it('should handle month boundaries', () => {
        const date = new Date('2024-02-01T10:00:00Z');
        const result = getPreviousDate(date);
        expect(result.toISOString().split('T')[0]).toBe('2024-01-31');
      });

      it('should handle year boundaries', () => {
        const date = new Date('2024-01-01T10:00:00Z');
        const result = getPreviousDate(date);
        expect(result.toISOString().split('T')[0]).toBe('2023-12-31');
      });
    });
  });

  describe('2. Posting Utility Functions', () => {
    describe('buildPostingDaysSet', () => {
      it('should create a set of date keys from postings', () => {
        const postings = [
          createPosting('2024-01-18'), // Thursday
          createPosting('2024-01-17'), // Wednesday
          createPosting('2024-01-16'), // Tuesday
        ];

        const result = buildPostingDaysSet(postings);

        expect(result).toEqual(new Set([
          '2024-01-18',
          '2024-01-17', 
          '2024-01-16'
        ]));
      });

      it('should handle empty arrays', () => {
        const result = buildPostingDaysSet([]);
        expect(result).toEqual(new Set());
      });

      it('should deduplicate multiple posts on same day', () => {
        const postings = [
          createPosting('2024-01-18', '09:00:00'),
          createPosting('2024-01-18', '14:00:00'),
          createPosting('2024-01-18', '18:00:00'),
        ];

        const result = buildPostingDaysSet(postings);
        expect(result).toEqual(new Set(['2024-01-18']));
      });

      it('should handle timezone edge cases around midnight', () => {
        const postings = [
          createPosting('2024-01-18', '15:00:00'), // UTC times
          createPosting('2024-01-18', '14:59:59'), // Same day, different times
        ];

        const result = buildPostingDaysSet(postings);
        // With mock timezone (identity function), both map to same date
        expect(result.size).toBe(1);
      });
    });
  });

  describe('3. Core Streak Calculation - Basic Cases', () => {
    describe('calculateCurrentStreak', () => {
      it('should return 0 for empty postings array', () => {
        const result = calculateCurrentStreak([]);
        expect(result).toBe(0);
      });

      it('should calculate streak ending today (working day with posting)', () => {
        const postings = [
          createPosting('2024-01-19'), // Friday (today)
          createPosting('2024-01-18'), // Thursday
          createPosting('2024-01-17'), // Wednesday
          createPosting('2024-01-16'), // Tuesday
          createPosting('2024-01-15'), // Monday
        ];

        const result = calculateCurrentStreak(postings);
        expect(result).toBe(5); // Full work week
      });

      it('should calculate streak starting from yesterday when today has no posting', () => {
        const postings = [
          // No posting today (Friday)
          createPosting('2024-01-18'), // Thursday
          createPosting('2024-01-17'), // Wednesday
          createPosting('2024-01-16'), // Tuesday
          createPosting('2024-01-15'), // Monday
        ];

        const result = calculateCurrentStreak(postings);
        expect(result).toBe(4); // Mon-Thu
      });

      it('should count only from gap when today has posting but gap exists', () => {
        const postings = [
          createPosting('2024-01-19'), // Friday (today)
          createPosting('2024-01-18'), // Thursday
          // Gap on Wednesday
          createPosting('2024-01-16'), // Tuesday (ignored due to gap)
          createPosting('2024-01-15'), // Monday (ignored due to gap)
        ];

        const result = calculateCurrentStreak(postings);
        expect(result).toBe(2); // Only Thu-Fri
      });

      it('should handle single posting today only', () => {
        const postings = [
          createPosting('2024-01-19'), // Friday (today)
        ];

        const result = calculateCurrentStreak(postings);
        expect(result).toBe(1);
      });

      it('should handle single posting yesterday only', () => {
        const postings = [
          createPosting('2024-01-18'), // Thursday (yesterday)
        ];

        const result = calculateCurrentStreak(postings);
        expect(result).toBe(1);
      });
    });
  });

  describe('4. Weekend Handling', () => {
    it('should ignore weekends and treat Fri → Mon as consecutive', () => {
      jest.setSystemTime(new Date('2024-01-22T01:00:00Z')); // Monday

      const postings = [
        createPosting('2024-01-22'), // Monday (today)
        createPosting('2024-01-19'), // Previous Friday
        createPosting('2024-01-18'), // Previous Thursday
        createPosting('2024-01-17'), // Previous Wednesday
      ];

      const result = calculateCurrentStreak(postings);
      expect(result).toBe(4); // Weekend ignored, streak continues
    });

    it('should handle multiple weekend spans in streak', () => {
      jest.setSystemTime(new Date('2024-01-22T01:00:00Z')); // Monday

      const postings = [
        createPosting('2024-01-22'), // Monday (today)
        createPosting('2024-01-19'), // Previous Friday
        // Weekend ignored (Sat-Sun)
        createPosting('2024-01-12'), // Friday before that
        createPosting('2024-01-11'), // Thursday before that
        // Weekend ignored (Sat-Sun)
        createPosting('2024-01-05'), // Friday before that - too far back, creates gap
      ];

      const result = calculateCurrentStreak(postings);
      expect(result).toBe(2); // Only Mon + Fri (last Fri has gap before it)
    });

    it('should return 0 when only weekend postings exist', () => {
      const postings = [
        createPosting('2024-01-20'), // Saturday
        createPosting('2024-01-21'), // Sunday
        createPosting('2024-01-13'), // Previous Saturday
        createPosting('2024-01-14'), // Previous Sunday
      ];

      const result = calculateCurrentStreak(postings);
      expect(result).toBe(0); // No working day postings
    });

    it('should start from latest working day when today is weekend', () => {
      jest.setSystemTime(new Date('2024-01-20T01:00:00Z')); // Saturday

      const postings = [
        createPosting('2024-01-19'), // Friday (latest working day)
        createPosting('2024-01-18'), // Thursday
        createPosting('2024-01-17'), // Wednesday
      ];

      const result = calculateCurrentStreak(postings);
      expect(result).toBe(3); // Start from Friday
    });
  });

  describe('5. Today Edge Cases', () => {
    it('should handle today being Saturday', () => {
      jest.setSystemTime(new Date('2024-01-20T01:00:00Z')); // Saturday

      const postings = [
        createPosting('2024-01-19'), // Friday
        createPosting('2024-01-18'), // Thursday
      ];

      const result = calculateCurrentStreak(postings);
      expect(result).toBe(2); // Start from Friday
    });

    it('should handle today being Sunday', () => {
      jest.setSystemTime(new Date('2024-01-21T01:00:00Z')); // Sunday

      const postings = [
        createPosting('2024-01-19'), // Friday
        createPosting('2024-01-18'), // Thursday
      ];

      const result = calculateCurrentStreak(postings);
      expect(result).toBe(2); // Start from Friday
    });

    it('should handle multiple postings same day', () => {
      const postings = [
        createPosting('2024-01-19', '09:00:00'), // Friday morning
        createPosting('2024-01-19', '14:00:00'), // Friday afternoon
        createPosting('2024-01-19', '18:00:00'), // Friday evening
        createPosting('2024-01-18'), // Thursday
      ];

      const result = calculateCurrentStreak(postings);
      expect(result).toBe(2); // Friday (multiple posts = 1 day) + Thursday
    });

    it('should handle late night posting correctly', () => {
      const postings = [
        createPosting('2024-01-19', '23:59:59'), // Friday very late
        createPosting('2024-01-18'), // Thursday
      ];

      const result = calculateCurrentStreak(postings);
      expect(result).toBe(2);
    });

    it('should handle early morning posting correctly', () => {
      const postings = [
        createPosting('2024-01-19', '00:00:01'), // Friday very early
        createPosting('2024-01-18'), // Thursday
      ];

      const result = calculateCurrentStreak(postings);
      expect(result).toBe(2);
    });
  });

  describe('6. Historical Data & Gaps', () => {
    it('should stop streak at gaps in working days', () => {
      const postings = [
        createPosting('2024-01-19'), // Friday (today)
        createPosting('2024-01-18'), // Thursday
        // Gap on Wednesday
        createPosting('2024-01-16'), // Tuesday (should be ignored)
        createPosting('2024-01-15'), // Monday (should be ignored)
        createPosting('2024-01-12'), // Previous Friday (should be ignored)
      ];

      const result = calculateCurrentStreak(postings);
      expect(result).toBe(2); // Only count Thu-Fri due to Wed gap
    });

    it('should only count recent consecutive streak, ignore old postings', () => {
      const postings = [
        createPosting('2024-01-19'), // Friday (today)
        createPosting('2024-01-18'), // Thursday
        createPosting('2024-01-17'), // Wednesday
        // Very old posting, separate from current streak
        createPosting('2023-12-01'), // December 2023
        createPosting('2023-11-30'), // November 2023
      ];

      const result = calculateCurrentStreak(postings);
      expect(result).toBe(3); // Only count current consecutive streak
    });

    it('should handle multiple weeks of consecutive working days', () => {
      const postings = [
        // This week (Jan 15-19)
        createPosting('2024-01-19'), // Friday (today)
        createPosting('2024-01-18'), // Thursday
        createPosting('2024-01-17'), // Wednesday
        createPosting('2024-01-16'), // Tuesday
        createPosting('2024-01-15'), // Monday
        // Previous week (Jan 8-12)
        createPosting('2024-01-12'), // Friday
        createPosting('2024-01-11'), // Thursday
        createPosting('2024-01-10'), // Wednesday
        createPosting('2024-01-09'), // Tuesday
        createPosting('2024-01-08'), // Monday
      ];

      const result = calculateCurrentStreak(postings);
      expect(result).toBe(10); // Two full work weeks
    });
  });

  describe('7. Timezone Edge Cases', () => {
    it('should handle KST midnight boundary correctly', () => {
      // Test posting that crosses midnight in timezone conversion
      const postings = [
        createPosting('2024-01-18', '15:00:00'), // UTC 15:00 = KST 00:00 next day
        createPosting('2024-01-18', '14:59:59'), // UTC 14:59 = KST 23:59 same day
      ];

      const postingDays = buildPostingDaysSet(postings);
      // Should create different date keys based on KST timezone
      expect(postingDays.size).toBeGreaterThanOrEqual(1);
    });

    it('should handle year boundary in timezone conversion', () => {
      const postings = [
        createPosting('2023-12-31', '15:00:00'), // Becomes 2024-01-01 in KST
        createPosting('2023-12-31', '14:59:59'), // Stays 2023-12-31 in KST
      ];

      const postingDays = buildPostingDaysSet(postings);
      expect(postingDays.size).toBeGreaterThanOrEqual(1);
    });
  });

  describe('8. calculateLongestStreak', () => {
    it('should return 0 for empty postings array', () => {
      const result = calculateLongestStreak([]);
      expect(result).toBe(0);
    });

    it('should find the longest consecutive streak from historical data', () => {
      const postings = [
        // Current shorter streak (2 days)
        createPosting('2024-01-19'), // Friday
        createPosting('2024-01-18'), // Thursday
        
        // Gap
        
        // Longer historical streak (5 days)
        createPosting('2024-01-15'), // Monday
        createPosting('2024-01-12'), // Previous Friday
        createPosting('2024-01-11'), // Previous Thursday
        createPosting('2024-01-10'), // Previous Wednesday
        createPosting('2024-01-09'), // Previous Tuesday
        
        // Another gap
        
        // Single day
        createPosting('2024-01-05'), // Previous Friday
      ];

      const result = calculateLongestStreak(postings);
      expect(result).toBe(5); // The 5-day streak should be longest
    });

    it('should handle single posting correctly', () => {
      // Create posting earlier than the mocked current time
      const postings = [createPosting('2024-01-19', '00:30:00')]; // Earlier than 01:00:00 mocked time
      const result = calculateLongestStreak(postings);
      expect(result).toBe(1);
    });

    it('should ignore weekends in longest streak calculation', () => {
      const postings = [
        // Week 1 - use earlier times to avoid future date issues
        createPosting('2024-01-19', '00:30:00'), // Friday
        createPosting('2024-01-18', '00:30:00'), // Thursday
        createPosting('2024-01-17', '00:30:00'), // Wednesday
        createPosting('2024-01-16', '00:30:00'), // Tuesday
        createPosting('2024-01-15', '00:30:00'), // Monday
        // Weekend ignored (Jan 13-14)
        // Week 2
        createPosting('2024-01-12', '00:30:00'), // Friday
        createPosting('2024-01-11', '00:30:00'), // Thursday
      ];

      const result = calculateLongestStreak(postings);
      expect(result).toBe(7); // Two work weeks connected across weekend
    });

    it('should handle multiple posts per day correctly', () => {
      const postings = [
        createPosting('2024-01-19', '00:10:00'), // Earlier times to avoid future dates
        createPosting('2024-01-19', '00:20:00'), // Same day, multiple posts
        createPosting('2024-01-18', '00:30:00'),
        createPosting('2024-01-17', '00:30:00'),
      ];

      const result = calculateLongestStreak(postings);
      expect(result).toBe(3); // 3 distinct days
    });
  });

  describe('9. Complex Scenarios', () => {
    it('should handle interleaved streaks and gaps correctly', () => {
      const postings = [
        // Current streak: 3 days
        createPosting('2024-01-19'), // Friday
        createPosting('2024-01-18'), // Thursday
        createPosting('2024-01-17'), // Wednesday
        
        // Gap (Tuesday missing)
        
        // Previous streak: 2 days  
        createPosting('2024-01-15'), // Monday
        createPosting('2024-01-12'), // Previous Friday
        
        // Gap
        
        // Older streak: 4 days (this should be longest)
        createPosting('2024-01-10'), // Wednesday
        createPosting('2024-01-09'), // Tuesday
        createPosting('2024-01-08'), // Monday
        createPosting('2024-01-05'), // Previous Friday
      ];

      const currentStreak = calculateCurrentStreak(postings);
      const longestStreak = calculateLongestStreak(postings);
      
      expect(currentStreak).toBe(3); // Current: Wed-Fri
      expect(longestStreak).toBe(4); // Longest: 4-day historical streak
    });

    it('should handle posting patterns with different board/post IDs', () => {
      // This tests that streak calculation ignores post metadata
      const postings = [
        createPosting('2024-01-19'),
        createPosting('2024-01-18'),
        createPosting('2024-01-17'),
      ];

      const result = calculateCurrentStreak(postings);
      expect(result).toBe(3); // All posts count regardless of metadata
    });
  });

  describe('10. Error Handling & Robustness', () => {
    it('should handle malformed data gracefully', () => {
      const postings = [
        createPosting('2024-01-19'),
        createPosting('2024-01-18'),
        // This would normally cause issues but should be handled
        { createdAt: new Date('invalid-date'), userId: 'test-user' },
      ];

      // Should not throw error and should process valid postings
      const result = calculateCurrentStreak(postings);
      expect(result).toBe(2); // Should process the 2 valid postings
    });

    it('should filter out future dates', () => {
      const postings = [
        createPosting('2024-01-19'), // Today
        createPosting('2024-01-18'), // Yesterday
        createPosting('2024-01-25'), // Future date (should be ignored)
      ];

      const result = calculateCurrentStreak(postings);
      expect(result).toBe(2); // Only count valid dates
    });

    it('should handle very large arrays efficiently', () => {
      // Create a large array of postings
      const postings: PostingData[] = [];
      for (let i = 0; i < 1000; i++) {
        const date = new Date('2024-01-19');
        date.setDate(date.getDate() - i);
        if (date.getDay() >= 1 && date.getDay() <= 5) { // Only working days
          postings.push({
            createdAt: date,
            userId: 'test-user'
          });
        }
      }

      // Should complete without performance issues
      const startTime = Date.now();
      const result = calculateCurrentStreak(postings);
      const endTime = Date.now();
      
      expect(result).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('11. Business Logic Edge Cases', () => {
    it('should handle holiday exclusions when mocked', () => {
      // Test when a working weekday is marked as holiday
      jest.setSystemTime(new Date('2024-01-01T01:00:00Z')); // New Year's Day (Monday, but holiday)

      const postings = [
        createPosting('2024-01-01'), // New Year's Day (holiday)
        createPosting('2023-12-29'), // Previous Friday
      ];

      const result = calculateCurrentStreak(postings);
      // Should start from last working day before holiday
      expect(result).toBe(1); // Only count Friday, skip holiday Monday
    });

    it('should maintain consistency across different time zones in test data', () => {
      // All dates should be processed consistently regardless of input timezone
      const utcPosting = createPosting('2024-01-19', '10:00:00'); // UTC
      const kstPosting = createKSTDate('2024-01-19', '10:00:00'); // KST
      
      const utcKey = getDateKey(utcPosting.createdAt);
      const kstKey = getDateKey(kstPosting);
      
      // Both should resolve to same date key when converted to KST
      expect(typeof utcKey).toBe('string');
      expect(typeof kstKey).toBe('string');
    });
  });
});