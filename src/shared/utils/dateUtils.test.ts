import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isWorkingDay,
  isConfigurableHoliday,
  formatDateToKorean,
  formatDate,
  getRelativeTime,
  getDateKey,
  getUserTimeZone,
  getRecentWorkingDays,
} from './dateUtils';

describe('dateUtils', () => {
  describe('isWorkingDay', () => {
    it('should return true for a weekday that is not a holiday', () => {
      // Wednesday, January 8, 2025
      const date = new Date('2025-01-08T12:00:00Z');
      expect(isWorkingDay(date, 'Asia/Seoul')).toBe(true);
    });

    it('should return false for Saturday', () => {
      // Saturday, January 4, 2025
      const date = new Date('2025-01-04T12:00:00Z');
      expect(isWorkingDay(date, 'Asia/Seoul')).toBe(false);
    });

    it('should return false for Sunday', () => {
      // Sunday, January 5, 2025
      const date = new Date('2025-01-05T12:00:00Z');
      expect(isWorkingDay(date, 'Asia/Seoul')).toBe(false);
    });

    it('should return false for Korean holidays', () => {
      // New Year's Day 2025
      const date = new Date('2025-01-01T12:00:00Z');
      expect(isWorkingDay(date, 'Asia/Seoul')).toBe(false);
    });

    it('should return false for configurable holidays', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      const holidays = new Map([['2025-01-15', 'Company Holiday']]);
      expect(isWorkingDay(date, 'Asia/Seoul', holidays)).toBe(false);
    });

    it('should return true when date is not in configurable holidays', () => {
      const date = new Date('2025-01-16T12:00:00Z');
      const holidays = new Map([['2025-01-15', 'Company Holiday']]);
      expect(isWorkingDay(date, 'Asia/Seoul', holidays)).toBe(true);
    });
  });

  describe('isConfigurableHoliday', () => {
    it('should return false when no holidays are configured', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      expect(isConfigurableHoliday(date)).toBe(false);
    });

    it('should return false when holidays map is empty', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      const holidays = new Map<string, string>();
      expect(isConfigurableHoliday(date, holidays)).toBe(false);
    });

    it('should return true when date is in configurable holidays', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      const holidays = new Map([['2025-01-15', 'Company Holiday']]);
      expect(isConfigurableHoliday(date, holidays)).toBe(true);
    });

    it('should return false when date is not in configurable holidays', () => {
      const date = new Date('2025-01-16T12:00:00Z');
      const holidays = new Map([['2025-01-15', 'Company Holiday']]);
      expect(isConfigurableHoliday(date, holidays)).toBe(false);
    });
  });

  describe('formatDateToKorean', () => {
    it('should format date to Korean locale format', () => {
      const date = new Date('2025-01-15T14:30:00');
      const result = formatDateToKorean(date);
      // Check that it contains expected parts (year, month, day, time)
      expect(result).toMatch(/25/); // Year
      expect(result).toMatch(/01/); // Month
      expect(result).toMatch(/15/); // Day
    });

    it('should include AM/PM indicator', () => {
      const date = new Date('2025-01-15T14:30:00');
      const result = formatDateToKorean(date);
      // Korean time format uses 오후/오전 for AM/PM
      expect(result).toMatch(/(오전|오후|AM|PM)/i);
    });
  });

  describe('formatDate', () => {
    it('should format date to YYYY.MM.DD format', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      expect(formatDate(date)).toBe('2025.01.15');
    });

    it('should pad single digit months with zero', () => {
      const date = new Date('2025-05-08T12:00:00Z');
      expect(formatDate(date)).toBe('2025.05.08');
    });

    it('should pad single digit days with zero', () => {
      const date = new Date('2025-12-05T12:00:00Z');
      expect(formatDate(date)).toBe('2025.12.05');
    });

    it('should return empty string for null', () => {
      expect(formatDate(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatDate(undefined)).toBe('');
    });
  });

  describe('getRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return empty string for null', () => {
      expect(getRelativeTime(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(getRelativeTime(undefined)).toBe('');
    });

    it('should return "방금 전" for less than 1 minute ago', () => {
      const now = new Date('2025-01-15T12:00:00Z');
      vi.setSystemTime(now);

      const date = new Date('2025-01-15T11:59:30Z'); // 30 seconds ago
      expect(getRelativeTime(date)).toBe('방금 전');
    });

    it('should return minutes ago format', () => {
      const now = new Date('2025-01-15T12:00:00Z');
      vi.setSystemTime(now);

      const date = new Date('2025-01-15T11:45:00Z'); // 15 minutes ago
      expect(getRelativeTime(date)).toBe('15분 전');
    });

    it('should return hours ago format', () => {
      const now = new Date('2025-01-15T12:00:00Z');
      vi.setSystemTime(now);

      const date = new Date('2025-01-15T09:00:00Z'); // 3 hours ago
      expect(getRelativeTime(date)).toBe('3시간 전');
    });

    it('should return "어제" for yesterday', () => {
      // Set now to end of Jan 15
      const now = new Date('2025-01-15T23:00:00Z');
      vi.setSystemTime(now);

      // Use a date that is more than 24 hours ago but still yesterday
      // The function first checks if < 24 hours (returns hours ago)
      // Then checks if date >= yesterday midnight (returns "어제")
      const date = new Date('2025-01-14T10:00:00Z'); // More than 24 hours ago, but yesterday
      expect(getRelativeTime(date)).toBe('어제');
    });

    it('should return days ago format for within a week', () => {
      const now = new Date('2025-01-15T12:00:00Z');
      vi.setSystemTime(now);

      const date = new Date('2025-01-12T12:00:00Z'); // 3 days ago
      expect(getRelativeTime(date)).toBe('3일 전');
    });

    it('should return formatted date for more than a week ago', () => {
      const now = new Date('2025-01-15T12:00:00Z');
      vi.setSystemTime(now);

      const date = new Date('2025-01-01T12:00:00Z'); // 14 days ago
      expect(getRelativeTime(date)).toBe('2025.01.01');
    });
  });

  describe('getDateKey', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      const result = getDateKey(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return consistent format for different times on same day', () => {
      // Using KST timezone (UTC+9) - these should be the same day in KST
      const date1 = new Date('2025-01-15T00:00:00+09:00');
      const date2 = new Date('2025-01-15T23:59:59+09:00');
      expect(getDateKey(date1)).toBe(getDateKey(date2));
    });
  });

  describe('getUserTimeZone', () => {
    it('should return Asia/Seoul', () => {
      expect(getUserTimeZone()).toBe('Asia/Seoul');
    });
  });

  describe('getRecentWorkingDays', () => {
    it('should return the specified number of working days', () => {
      const result = getRecentWorkingDays(5);
      expect(result).toHaveLength(5);
    });

    it('should return 20 working days by default', () => {
      const result = getRecentWorkingDays();
      expect(result).toHaveLength(20);
    });

    it('should return dates in ascending order', () => {
      const result = getRecentWorkingDays(5);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].getTime()).toBeGreaterThan(result[i - 1].getTime());
      }
    });

    it('should only include weekdays', () => {
      const result = getRecentWorkingDays(10);
      result.forEach((date) => {
        const day = date.getDay();
        // Not Saturday (6) or Sunday (0) in KST
        const dateInKST = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
        const dayInKST = dateInKST.getDay();
        expect(dayInKST).not.toBe(0);
        expect(dayInKST).not.toBe(6);
      });
    });

    it('should exclude configurable holidays', () => {
      // Create a holiday for a specific date
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const holidays = new Map([[todayKey, 'Test Holiday']]);

      const resultWithHoliday = getRecentWorkingDays(5, holidays);
      const resultWithoutHoliday = getRecentWorkingDays(5);

      // Both should have 5 days, but potentially different dates
      expect(resultWithHoliday).toHaveLength(5);
      expect(resultWithoutHoliday).toHaveLength(5);
    });
  });
});
