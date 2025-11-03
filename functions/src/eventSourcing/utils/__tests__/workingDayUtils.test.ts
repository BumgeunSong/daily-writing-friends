import { describe, it, expect, jest } from '@jest/globals';
import {
  isHolidayByDayKey,
  isWorkingDayByTz,
  isWorkingDayByTzAsync,
} from '../workingDayUtils';
import { toHolidayMap, createEmptyHolidayMap } from '../../types/Holiday';

// Mock admin
jest.mock('../../../shared/admin');

describe('Working Day Utilities', () => {
  const TIMEZONE = 'Asia/Seoul';

  describe('isWorkingDayByTz with holiday support', () => {
    const koreanHolidays2025 = toHolidayMap([
      { date: '2025-03-01', name: '삼일절' }, // Saturday
      { date: '2025-05-05', name: '어린이날' }, // Monday
      { date: '2025-06-06', name: '현충일' }, // Friday
    ]);

    describe('when checking weekends', () => {
      it('returns false for Saturday', () => {
        expect(isWorkingDayByTz('2025-03-08', TIMEZONE)).toBe(false);
        expect(isWorkingDayByTz('2025-03-08', TIMEZONE, koreanHolidays2025)).toBe(false);
      });

      it('returns false for Sunday', () => {
        expect(isWorkingDayByTz('2025-03-09', TIMEZONE)).toBe(false);
        expect(isWorkingDayByTz('2025-03-09', TIMEZONE, koreanHolidays2025)).toBe(false);
      });
    });

    describe('when checking holidays', () => {
      it('returns false for weekday holidays', () => {
        // 어린이날 (Monday)
        expect(isWorkingDayByTz('2025-05-05', TIMEZONE, koreanHolidays2025)).toBe(false);

        // 현충일 (Friday)
        expect(isWorkingDayByTz('2025-06-06', TIMEZONE, koreanHolidays2025)).toBe(false);
      });

      it('returns true for holidays when no holiday map provided', () => {
        // Without holiday map, only weekends are checked
        expect(isWorkingDayByTz('2025-05-05', TIMEZONE)).toBe(true); // Monday
        expect(isWorkingDayByTz('2025-06-06', TIMEZONE)).toBe(true); // Friday
      });

      it('returns false for weekend holidays', () => {
        // 삼일절 (Saturday) - weekend takes precedence
        expect(isWorkingDayByTz('2025-03-01', TIMEZONE, koreanHolidays2025)).toBe(false);
      });
    });

    describe('when checking regular working days', () => {
      it('returns true for Monday-Friday (non-holidays)', () => {
        expect(isWorkingDayByTz('2025-03-03', TIMEZONE, koreanHolidays2025)).toBe(true); // Monday
        expect(isWorkingDayByTz('2025-03-04', TIMEZONE, koreanHolidays2025)).toBe(true); // Tuesday
        expect(isWorkingDayByTz('2025-03-05', TIMEZONE, koreanHolidays2025)).toBe(true); // Wednesday
        expect(isWorkingDayByTz('2025-03-06', TIMEZONE, koreanHolidays2025)).toBe(true); // Thursday
        expect(isWorkingDayByTz('2025-03-07', TIMEZONE, koreanHolidays2025)).toBe(true); // Friday
      });
    });

    describe('when holiday map is empty', () => {
      it('behaves same as without holiday map', () => {
        const emptyMap = createEmptyHolidayMap();

        expect(isWorkingDayByTz('2025-03-03', TIMEZONE, emptyMap)).toBe(true); // Monday
        expect(isWorkingDayByTz('2025-03-08', TIMEZONE, emptyMap)).toBe(false); // Saturday
      });
    });
  });

  describe('isWorkingDayByTzAsync', () => {
    it('returns same results as sync version for weekends', async () => {
      // Saturday
      const asyncResult1 = await isWorkingDayByTzAsync('2025-03-08', TIMEZONE);
      const syncResult1 = isWorkingDayByTz('2025-03-08', TIMEZONE);
      expect(asyncResult1).toBe(syncResult1);
      expect(asyncResult1).toBe(false);

      // Monday
      const asyncResult2 = await isWorkingDayByTzAsync('2025-03-03', TIMEZONE);
      const syncResult2 = isWorkingDayByTz('2025-03-03', TIMEZONE);
      expect(asyncResult2).toBe(syncResult2);
      expect(asyncResult2).toBe(true);
    });

    it('uses cached holidays when called multiple times', async () => {
      // First call - fetches from Firestore
      const result1 = await isWorkingDayByTzAsync('2025-05-05', TIMEZONE);

      // Second call - should use cache
      const result2 = await isWorkingDayByTzAsync('2025-05-05', TIMEZONE);

      expect(result1).toBe(result2);
    });
  });
});

describe('Holiday Fetching Utilities', () => {
  describe('isHolidayByDayKey', () => {
    it('returns false when no holiday map provided', () => {
      expect(isHolidayByDayKey('2025-03-01')).toBe(false);
      expect(isHolidayByDayKey('2025-03-01', undefined)).toBe(false);
    });

    it('returns false when holiday map is empty', () => {
      const emptyMap = createEmptyHolidayMap();
      expect(isHolidayByDayKey('2025-03-01', emptyMap)).toBe(false);
    });

    it('returns true when day is in holiday map', () => {
      const holidayMap = toHolidayMap([
        { date: '2025-03-01', name: '삼일절' },
        { date: '2025-05-05', name: '어린이날' },
      ]);

      expect(isHolidayByDayKey('2025-03-01', holidayMap)).toBe(true);
      expect(isHolidayByDayKey('2025-05-05', holidayMap)).toBe(true);
    });

    it('returns false when day is not in holiday map', () => {
      const holidayMap = toHolidayMap([{ date: '2025-03-01', name: '삼일절' }]);

      expect(isHolidayByDayKey('2025-03-02', holidayMap)).toBe(false);
      expect(isHolidayByDayKey('2025-05-05', holidayMap)).toBe(false);
    });
  });

  describe('Holiday type utilities', () => {
    it('creates empty holiday map', () => {
      const map = createEmptyHolidayMap();
      expect(map.size).toBe(0);
      expect(map.has('2025-03-01')).toBe(false);
    });

    it('converts holiday array to map', () => {
      const holidays = [
        { date: '2025-03-01', name: '삼일절' },
        { date: '2025-05-05', name: '어린이날' },
        { date: '2025-06-06', name: '현충일' },
      ];

      const map = toHolidayMap(holidays);

      expect(map.size).toBe(3);
      expect(map.get('2025-03-01')).toBe('삼일절');
      expect(map.get('2025-05-05')).toBe('어린이날');
      expect(map.get('2025-06-06')).toBe('현충일');
    });

    it('handles duplicate dates in holiday array', () => {
      const holidays = [
        { date: '2025-03-01', name: '삼일절' },
        { date: '2025-03-01', name: 'Duplicate' }, // Later one wins
      ];

      const map = toHolidayMap(holidays);

      expect(map.size).toBe(1);
      expect(map.get('2025-03-01')).toBe('Duplicate');
    });
  });
});
