import { describe, it, expect, jest } from '@jest/globals';
import { isHolidayByDayKey } from '../workingDayUtils';
import { toHolidayMap, createEmptyHolidayMap } from '../../types/Holiday';

// Mock admin
jest.mock('../../../shared/admin');

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
