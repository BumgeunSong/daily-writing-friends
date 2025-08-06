import { describe, it, expect } from '@jest/globals';
import {
  formatSeoulDate,
  getSeoulDateBoundaries,
  isSameDateInSeoul,
} from '../calendar';

describe('Seoul Time Behavior Tests', () => {
  describe('Seoul Date Formatting', () => {
    describe('when formatting dates in Seoul timezone', () => {
      it('formats date as YYYY-MM-DD in Seoul timezone', () => {
        const utcDate = new Date('2025-07-31T06:30:00Z'); // 6:30 AM UTC = 3:30 PM Seoul

        const seoulDateString = formatSeoulDate(utcDate);

        expect(seoulDateString).toBe('2025-07-31'); // Same date in Seoul
      });

      it('handles UTC midnight correctly', () => {
        const utcMidnight = new Date('2025-07-31T00:00:00Z'); // Midnight UTC = 9 AM Seoul

        const seoulDateString = formatSeoulDate(utcMidnight);

        expect(seoulDateString).toBe('2025-07-31'); // Same date in Seoul
      });

      it('handles date boundary crossing', () => {
        const utcLateEvening = new Date('2025-07-30T16:00:00Z'); // 4 PM UTC = 1 AM Seoul next day

        const seoulDateString = formatSeoulDate(utcLateEvening);

        expect(seoulDateString).toBe('2025-07-31'); // Next day in Seoul
      });
    });
  });

  describe('Seoul Date Boundaries', () => {
    describe('when creating date boundaries for Seoul timezone', () => {
      it('creates correct start and end timestamps', () => {
        const testDate = new Date('2025-07-31T10:00:00Z'); // 7 PM Seoul (July 31)

        const boundaries = getSeoulDateBoundaries(testDate);

        expect(boundaries.startTimestamp.toDate().toISOString()).toBe('2025-07-30T15:00:00.000Z'); // Seoul midnight as UTC
        expect(boundaries.endTimestamp.toDate().toISOString()).toBe('2025-07-31T14:59:59.999Z'); // Seoul end of day as UTC
      });

      it('handles timezone boundary edge cases', () => {
        const utcTimeSeoulNextDay = new Date('2025-07-30T20:00:00Z'); // 5 AM Seoul next day

        const dateString = formatSeoulDate(utcTimeSeoulNextDay);

        expect(dateString).toBe('2025-07-31'); // Should be July 31 in Seoul
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


  describe('Real-World Scenarios', () => {
    describe('when handling the original timezone bug case', () => {
      it('correctly processes July 31st Seoul time', () => {
        const testDate = new Date('2025-07-31T10:00:00Z'); // 7 PM Seoul

        const boundaries = getSeoulDateBoundaries(testDate);
        const dateString = formatSeoulDate(testDate);

        expect(dateString).toBe('2025-07-31');
        // These boundaries should properly capture Seoul July 31st for database queries
        expect(boundaries.startTimestamp.toDate().toISOString()).toBe('2025-07-30T15:00:00.000Z');
        expect(boundaries.endTimestamp.toDate().toISOString()).toBe('2025-07-31T14:59:59.999Z');
      });
    });

    describe('when handling edge cases around midnight', () => {
      it('correctly identifies date boundaries', () => {
        const justBeforeMidnight = new Date('2025-07-30T14:59:59Z'); // 11:59 PM Seoul
        const exactlyMidnight = new Date('2025-07-30T15:00:00Z'); // 12:00 AM Seoul
        const justAfterMidnight = new Date('2025-07-30T15:00:01Z'); // 12:00:01 AM Seoul

        expect(formatSeoulDate(justBeforeMidnight)).toBe('2025-07-30');
        expect(formatSeoulDate(exactlyMidnight)).toBe('2025-07-31');
        expect(formatSeoulDate(justAfterMidnight)).toBe('2025-07-31');
      });
    });
  });
});
