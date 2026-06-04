import { describe, it, expect } from 'vitest';
import {
  isWeekendDay,
  calculateGridPosition,
  calculateGridPositionDate,
  normalizeToMidnight,
  filterWeekdayContributions,
} from './gridPosition';
import { SUNDAY, SATURDAY } from './types';

// Anchor date: Monday 2025-01-06 00:00 local. This is the "4 weeks ago" Monday
// that callers pass as the grid origin.
const MONDAY_GRID_START = new Date(2025, 0, 6, 0, 0, 0, 0);

describe('isWeekendDay', () => {
  it('returns true for Sunday', () => {
    expect(isWeekendDay(SUNDAY)).toBe(true);
  });

  it('returns true for Saturday', () => {
    expect(isWeekendDay(SATURDAY)).toBe(true);
  });

  it.each([1, 2, 3, 4, 5])('returns false for weekday %i', (dayOfWeek) => {
    expect(isWeekendDay(dayOfWeek)).toBe(false);
  });
});

describe('calculateGridPosition', () => {
  it('returns null for Saturday', () => {
    const saturday = new Date(2025, 0, 11, 0, 0, 0, 0); // 2025-01-11 is Sat
    expect(calculateGridPosition(saturday, MONDAY_GRID_START)).toBeNull();
  });

  it('returns null for Sunday', () => {
    const sunday = new Date(2025, 0, 12, 0, 0, 0, 0); // 2025-01-12 is Sun
    expect(calculateGridPosition(sunday, MONDAY_GRID_START)).toBeNull();
  });

  it('places Monday of the start week at row 0, column 0', () => {
    expect(calculateGridPosition(MONDAY_GRID_START, MONDAY_GRID_START)).toEqual({
      weekRow: 0,
      weekdayColumn: 0,
    });
  });

  it('places Friday of the start week at row 0, column 4', () => {
    const friday = new Date(2025, 0, 10, 0, 0, 0, 0); // 2025-01-10 is Fri
    expect(calculateGridPosition(friday, MONDAY_GRID_START)).toEqual({
      weekRow: 0,
      weekdayColumn: 4,
    });
  });

  it('places Wednesday of week 1 at row 1, column 2', () => {
    const wedWeek1 = new Date(2025, 0, 15, 0, 0, 0, 0); // 2025-01-15 is Wed
    expect(calculateGridPosition(wedWeek1, MONDAY_GRID_START)).toEqual({
      weekRow: 1,
      weekdayColumn: 2,
    });
  });

  it('places the last visible weekday (Friday of week 3) at row 3, column 4', () => {
    const lastFriday = new Date(2025, 0, 31, 0, 0, 0, 0); // 2025-01-31 is Fri
    expect(calculateGridPosition(lastFriday, MONDAY_GRID_START)).toEqual({
      weekRow: 3,
      weekdayColumn: 4,
    });
  });

  it('returns null for dates past the visible window (week 4+)', () => {
    const monday5WeeksLater = new Date(2025, 1, 3, 0, 0, 0, 0); // 2025-02-03 Mon
    expect(calculateGridPosition(monday5WeeksLater, MONDAY_GRID_START)).toBeNull();
  });

  it('returns null for dates before the grid origin', () => {
    const fridayBefore = new Date(2025, 0, 3, 0, 0, 0, 0); // 2025-01-03 Fri
    expect(calculateGridPosition(fridayBefore, MONDAY_GRID_START)).toBeNull();
  });
});

describe('calculateGridPositionDate', () => {
  it('returns the start Monday for (row 0, column 0)', () => {
    const result = calculateGridPositionDate(MONDAY_GRID_START, 0, 0);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0);
    expect(result.getDate()).toBe(6);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('returns the Friday of week 0 for (0, 4)', () => {
    const result = calculateGridPositionDate(MONDAY_GRID_START, 0, 4);
    expect(result.getDate()).toBe(10);
  });

  it('returns the Friday of week 3 for (3, 4)', () => {
    const result = calculateGridPositionDate(MONDAY_GRID_START, 3, 4);
    expect(result.getDate()).toBe(31);
  });

  it('normalizes the result to midnight', () => {
    const nonMidnightStart = new Date(2025, 0, 6, 14, 30, 0, 0);
    const result = calculateGridPositionDate(nonMidnightStart, 1, 0);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('does not mutate the input weeksAgo date', () => {
    const original = new Date(2025, 0, 6, 0, 0, 0, 0);
    const snapshot = original.getTime();
    calculateGridPositionDate(original, 2, 3);
    expect(original.getTime()).toBe(snapshot);
  });
});

describe('normalizeToMidnight', () => {
  it('mutates the date in place to 00:00:00.000', () => {
    const date = new Date(2025, 0, 6, 14, 30, 45, 999);
    normalizeToMidnight(date);
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
    expect(date.getMilliseconds()).toBe(0);
  });

  it('leaves the calendar day unchanged', () => {
    const date = new Date(2025, 0, 6, 23, 59, 59, 999);
    normalizeToMidnight(date);
    expect(date.getDate()).toBe(6);
  });
});

describe('filterWeekdayContributions', () => {
  it('removes Saturday and Sunday entries by createdAt', () => {
    const contributions = [
      { createdAt: '2025-01-06' }, // Mon
      { createdAt: '2025-01-11' }, // Sat
      { createdAt: '2025-01-12' }, // Sun
      { createdAt: '2025-01-13' }, // Mon
    ];

    const result = filterWeekdayContributions(contributions);

    expect(result).toEqual([
      { createdAt: '2025-01-06' },
      { createdAt: '2025-01-13' },
    ]);
  });

  it('returns empty array for an all-weekend input', () => {
    const contributions = [
      { createdAt: '2025-01-11' },
      { createdAt: '2025-01-12' },
    ];
    expect(filterWeekdayContributions(contributions)).toEqual([]);
  });

  it('returns an empty array for an empty input', () => {
    expect(filterWeekdayContributions([])).toEqual([]);
  });

  it('preserves additional properties on each contribution', () => {
    const contributions = [
      { createdAt: '2025-01-06', contentLength: 100 },
      { createdAt: '2025-01-11', contentLength: 200 },
    ];
    const result = filterWeekdayContributions(contributions);
    expect(result).toEqual([{ createdAt: '2025-01-06', contentLength: 100 }]);
  });
});
