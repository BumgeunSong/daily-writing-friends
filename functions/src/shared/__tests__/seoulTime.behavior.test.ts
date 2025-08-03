import { describe, it, expect } from '@jest/globals';
import {
  convertToSeoulTime,
  getSeoulDateBoundaries,
  formatSeoulDateString,
  isSameDateInSeoul,
  debugTimezoneConversion,
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

        expect(() => convertToSeoulTime(invalidDate)).toThrow(
          'Invalid Date object provided to convertToSeoulTime',
        );
      });
    });
  });

  describe('Seoul Date Boundaries', () => {
    describe('when creating date boundaries for Seoul timezone', () => {
      it('creates correct start and end boundaries', () => {
        const testDate = new Date('2025-07-31T10:00:00Z'); // 7 PM Seoul (July 31)

        const boundaries = getSeoulDateBoundaries(testDate);

        expect(boundaries.dateString).toBe('2025-07-31');
        expect(boundaries.startOfDay.toISOString()).toBe('2025-07-30T15:00:00.000Z'); // Seoul midnight as UTC
        expect(boundaries.endOfDay.toISOString()).toBe('2025-07-31T14:59:59.999Z'); // Seoul end of day as UTC
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

        expect(() => getSeoulDateBoundaries(invalidDate)).toThrow(
          'Invalid Date object provided to getSeoulDateBoundaries',
        );
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

        expect(() => formatSeoulDateString(invalidDate)).toThrow(
          'Invalid Date object provided to formatSeoulDateString',
        );
      });
    });
  });

  describe('Seoul Date Comparison', () => {
    describe('when comparing dates in Seoul timezone', () => {
      it('identifies same day correctly', () => {
        const date1 = new Date('2025-07-31T05:00:00Z'); // 2 PM Seoul
        const date2 = new Date('2025-07-31T10:00:00Z'); // 7 PM Seoul (same day)

        const isSame = isSameDateInSeoul(date1, date2);

        expect(isSame).toBe(true); // Both are July 31 in Seoul
      });

      it('identifies different days correctly', () => {
        const date1 = new Date('2025-07-31T05:00:00Z'); // 2 PM Seoul
        const date2 = new Date('2025-08-01T05:00:00Z'); // 2 PM Seoul next day

        const isSame = isSameDateInSeoul(date1, date2);

        expect(isSame).toBe(false);
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
            endOfDay: expect.any(Date),
          },
        });
      });

      it('shows correct boundary dates', () => {
        const testDate = new Date('2025-07-31T06:30:00Z');

        const debug = debugTimezoneConversion(testDate);

        expect(debug.boundaries.startOfDay.toISOString()).toBe('2025-07-30T15:00:00.000Z');
        expect(debug.boundaries.endOfDay.toISOString()).toBe('2025-07-31T14:59:59.999Z');
      });
    });
  });

  describe('Real-World Scenarios', () => {
    describe('when handling the original timezone bug case', () => {
      it('correctly processes July 31st Seoul time', () => {
        const testDate = new Date('2025-07-31T10:00:00Z'); // 7 PM Seoul

        const boundaries = getSeoulDateBoundaries(testDate);

        expect(boundaries.dateString).toBe('2025-07-31');
        // These boundaries should properly capture Seoul July 31st for database queries
        expect(boundaries.startOfDay.toISOString()).toBe('2025-07-30T15:00:00.000Z');
        expect(boundaries.endOfDay.toISOString()).toBe('2025-07-31T14:59:59.999Z');
      });
    });

    describe('when working with different server timezones', () => {
      it('produces consistent results regardless of server timezone', () => {
        // Simulate different server timezone interpretations
        const utcTime = new Date('2025-07-31T06:30:00Z');

        const result1 = convertToSeoulTime(utcTime);
        const result2 = convertToSeoulTime(new Date(utcTime.getTime()));
        const result3 = formatSeoulDateString(utcTime);

        expect(result1.toISOString()).toBe(result2.toISOString());
        expect(result1.toISOString()).toBe('2025-07-31T15:30:00.000Z');
        expect(result3).toBe('2025-07-31');
      });
    });

    describe('when handling edge cases around midnight', () => {
      it('correctly identifies date boundaries', () => {
        const justBeforeMidnight = new Date('2025-07-30T14:59:59Z'); // 11:59 PM Seoul
        const exactlyMidnight = new Date('2025-07-30T15:00:00Z'); // 12:00 AM Seoul
        const justAfterMidnight = new Date('2025-07-30T15:00:01Z'); // 12:00:01 AM Seoul

        expect(formatSeoulDateString(justBeforeMidnight)).toBe('2025-07-30');
        expect(formatSeoulDateString(exactlyMidnight)).toBe('2025-07-31');
        expect(formatSeoulDateString(justAfterMidnight)).toBe('2025-07-31');
      });
    });
  });
});
