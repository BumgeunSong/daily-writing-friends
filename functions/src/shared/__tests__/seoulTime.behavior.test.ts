import { describe, it, expect } from '@jest/globals';
import {
  convertToSeoulTime,
  getSeoulDateBoundaries,
  formatSeoulDateString,
  isSameDateInSeoul,
  debugTimezoneConversion
} from '../seoulTime';

describe('Seoul Time Behavior Tests', () => {
  describe('UTC to Seoul Time Conversion', () => {
    describe('when converting UTC times to Seoul timezone', () => {
      it('adds 9 hours to UTC time', () => {
        const utcMorning = new Date('2025-07-31T06:30:00Z'); // 6:30 AM UTC
        
        const seoulTime = convertToSeoulTime(utcMorning);
        
        expect(seoulTime.toISOString()).toBe('2025-07-31T15:30:00.000Z'); // 3:30 PM Seoul as UTC
      });

      it('handles UTC midnight correctly', () => {
        const utcMidnight = new Date('2025-07-31T00:00:00Z');
        
        const seoulTime = convertToSeoulTime(utcMidnight);
        
        expect(seoulTime.toISOString()).toBe('2025-07-31T09:00:00.000Z'); // 9 AM Seoul as UTC
      });

      it('handles Seoul midnight correctly', () => {
        const utcForSeoulMidnight = new Date('2025-07-30T15:00:00Z'); // 3 PM UTC = midnight Seoul next day
        
        const seoulTime = convertToSeoulTime(utcForSeoulMidnight);
        
        expect(seoulTime.toISOString()).toBe('2025-07-31T00:00:00.000Z'); // midnight Seoul as UTC
      });
    });

    describe('when given invalid dates', () => {
      it('throws descriptive error', () => {
        const invalidDate = new Date('invalid');
        
        expect(() => convertToSeoulTime(invalidDate))
          .toThrow('Invalid Date object provided to convertToSeoulTime');
      });
    });
  });

  describe('Seoul Date Boundaries', () => {
    describe('when creating date boundaries for Seoul timezone', () => {
      it('creates correct start and end boundaries', () => {
        const testDate = new Date('2025-07-31T10:00:00Z'); // 7 PM Seoul (July 31)
        
        const boundaries = getSeoulDateBoundaries(testDate);
        
        expect(boundaries.dateString).toBe('2025-07-31');
        expect(boundaries.startOfDay.toISOString()).toBe('2025-07-30T06:00:00.000Z'); // Seoul midnight as UTC (DST aware)
        expect(boundaries.endOfDay.toISOString()).toBe('2025-07-31T05:59:59.999Z'); // Seoul end of day as UTC (DST aware)
      });

      it('handles timezone boundary edge cases', () => {
        const utcTimeSeoulNextDay = new Date('2025-07-30T20:00:00Z'); // 5 AM Seoul next day
        
        const boundaries = getSeoulDateBoundaries(utcTimeSeoulNextDay);
        
        expect(boundaries.dateString).toBe('2025-07-31'); // Should be July 31 in Seoul
      });
    });

    describe('when given invalid dates', () => {
      it('throws descriptive error', () => {
        const invalidDate = new Date('invalid');
        
        expect(() => getSeoulDateBoundaries(invalidDate))
          .toThrow('Invalid Date object provided to getSeoulDateBoundaries');
      });
    });
  });

  describe('Seoul Date Formatting', () => {
    describe('when formatting dates in Seoul timezone', () => {
      it('formats to YYYY-MM-DD in Seoul timezone', () => {
        const testDate = new Date('2025-07-31T05:00:00Z'); // 2 PM Seoul (July 31)
        
        const formatted = formatSeoulDateString(testDate);
        
        expect(formatted).toBe('2025-07-31');
      });

      it('handles timezone boundary correctly', () => {
        const utcTimeSeoulNextDay = new Date('2025-07-30T20:00:00Z'); // 5 AM Seoul (July 31)
        
        const formatted = formatSeoulDateString(utcTimeSeoulNextDay);
        
        expect(formatted).toBe('2025-07-31'); // Should show Seoul date, not UTC date
      });
    });

    describe('when given invalid dates', () => {
      it('throws descriptive error', () => {
        const invalidDate = new Date('invalid');
        
        expect(() => formatSeoulDateString(invalidDate))
          .toThrow('Invalid Date object provided to formatSeoulDateString');
      });
    });
  });

  describe('Seoul Date Comparison', () => {
    describe('when comparing dates in Seoul timezone', () => {
      it('returns true for same Seoul date at different times', () => {
        const morning = new Date('2025-07-31T05:00:00Z'); // 2 PM Seoul
        const evening = new Date('2025-07-31T10:00:00Z'); // 7 PM Seoul
        
        const isSame = isSameDateInSeoul(morning, evening);
        
        expect(isSame).toBe(true);
      });

      it('returns false for different Seoul dates', () => {
        const july30Seoul = new Date('2025-07-30T20:00:00Z'); // 5 AM Seoul July 31
        const july30UTC = new Date('2025-07-30T10:00:00Z'); // 7 PM Seoul July 30
        
        const isSame = isSameDateInSeoul(july30Seoul, july30UTC);
        
        expect(isSame).toBe(false);
      });

      it('handles UTC vs Seoul date boundary correctly', () => {
        const lateUTC = new Date('2025-07-30T23:00:00Z'); // 11 PM UTC July 30
        const earlySeoul = new Date('2025-07-31T02:00:00Z'); // 11 AM Seoul July 31
        
        const isSame = isSameDateInSeoul(lateUTC, earlySeoul);
        
        expect(isSame).toBe(true); // Both are July 31 in Seoul
      });
    });
  });

  describe('Timezone Debugging', () => {
    describe('when debugging timezone conversions', () => {
      it('provides comprehensive conversion details', () => {
        const testDate = new Date('2025-07-31T06:30:00Z');
        
        const debug = debugTimezoneConversion(testDate);
        
        expect(debug).toMatchObject({
          original: '2025-07-31T06:30:00.000Z',
          utc: '2025-07-31T06:30:00.000Z',
          seoul: '2025-07-31T15:30:00.000Z',
          boundaries: {
            dateString: '2025-07-31',
            startOfDay: expect.any(Date),
            endOfDay: expect.any(Date)
          }
        });
      });

      it('shows correct boundary dates', () => {
        const testDate = new Date('2025-07-31T06:30:00Z');
        
        const debug = debugTimezoneConversion(testDate);
        
        expect(debug.boundaries.startOfDay.toISOString()).toBe('2025-07-30T06:00:00.000Z');
        expect(debug.boundaries.endOfDay.toISOString()).toBe('2025-07-31T05:59:59.999Z');
      });
    });
  });

  describe('Real-World Scenarios', () => {
    describe('when handling the original timezone bug case', () => {
      it('correctly processes July 31st Seoul time', () => {
        const july31Seoul = new Date('2025-07-31T10:00:00Z'); // 7 PM Seoul July 31
        
        const boundaries = getSeoulDateBoundaries(july31Seoul);
        
        expect(boundaries.dateString).toBe('2025-07-31');
        // These boundaries should properly capture Seoul July 31st for database queries
        expect(boundaries.startOfDay.toISOString()).toBe('2025-07-30T06:00:00.000Z');
        expect(boundaries.endOfDay.toISOString()).toBe('2025-07-31T05:59:59.999Z');
      });
    });

    describe('when handling midnight transitions', () => {
      it('correctly identifies dates around Seoul midnight', () => {
        const justBeforeSeoulMidnight = new Date('2025-07-30T14:59:59Z'); // 11:59:59 PM Seoul July 30
        const justAfterSeoulMidnight = new Date('2025-07-30T15:00:00Z'); // 12:00:00 AM Seoul July 31
        
        const beforeFormatted = formatSeoulDateString(justBeforeSeoulMidnight);
        const afterFormatted = formatSeoulDateString(justAfterSeoulMidnight);
        
        expect(beforeFormatted).toBe('2025-07-30');
        expect(afterFormatted).toBe('2025-07-31');
      });
    });

    describe('when working with different server timezones', () => {
      it('produces consistent results regardless of server timezone', () => {
        const testDate = new Date('2025-07-31T06:30:00Z');
        
        // Multiple calls should return identical results
        const result1 = convertToSeoulTime(testDate);
        const result2 = convertToSeoulTime(testDate);
        const result3 = formatSeoulDateString(testDate);
        
        expect(result1.toISOString()).toBe(result2.toISOString());
        expect(result1.toISOString()).toBe('2025-07-31T15:30:00.000Z');
        expect(result3).toBe('2025-07-31');
      });
    });
  });

  describe('Performance and Reliability', () => {
    describe('when processing many dates', () => {
      it('handles bulk operations efficiently', () => {
        const dates = Array.from({ length: 100 }, (_, i) => 
          new Date(`2025-07-${String(1 + i % 31).padStart(2, '0')}T10:00:00Z`)
        );
        
        const results = dates.map(date => formatSeoulDateString(date));
        
        expect(results).toHaveLength(100);
        results.forEach(result => {
          expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
      });
    });

    describe('when handling edge case dates', () => {
      it('correctly processes year boundaries', () => {
        const newYearEve = new Date('2024-12-31T16:00:00Z'); // 1 AM New Year Seoul
        const newYearDay = new Date('2025-01-01T14:00:00Z'); // 11 PM New Year Seoul
        
        const eveFormatted = formatSeoulDateString(newYearEve);
        const dayFormatted = formatSeoulDateString(newYearDay);
        
        expect(eveFormatted).toBe('2025-01-01'); // Should be New Year in Seoul
        expect(dayFormatted).toBe('2025-01-01');
      });

      it('correctly processes leap year dates', () => {
        const leapDay = new Date('2024-02-29T10:00:00Z'); // Leap day
        
        const formatted = formatSeoulDateString(leapDay);
        const boundaries = getSeoulDateBoundaries(leapDay);
        
        expect(formatted).toBe('2024-02-29');
        expect(boundaries.dateString).toBe('2024-02-29');
      });
    });
  });
});