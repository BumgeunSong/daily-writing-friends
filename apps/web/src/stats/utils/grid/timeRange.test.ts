import { describe, it, expect } from 'vitest';
import {
  formatDateInKoreanTimezone,
  getTimeRange,
  filterContributionsInTimeRange,
  isDateWithinTodayInclusive,
} from './timeRange';

// Helper: build a Date whose local-time day/month/year are guaranteed values
// independent of the runner timezone. We anchor on noon to stay well inside
// the same KST day.
function localNoon(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

describe('formatDateInKoreanTimezone', () => {
  it('returns YYYY-MM-DD for an explicit KST timestamp', () => {
    const date = new Date('2025-01-06T12:00:00+09:00');
    expect(formatDateInKoreanTimezone(date)).toBe('2025-01-06');
  });

  it('returns the KST calendar date for a UTC timestamp before midnight KST', () => {
    // 2025-01-05T23:30:00Z → 2025-01-06 08:30 KST
    const date = new Date('2025-01-05T23:30:00Z');
    expect(formatDateInKoreanTimezone(date)).toBe('2025-01-06');
  });

  it('returns the KST calendar date even for late-night UTC that has already rolled over in KST', () => {
    // 2025-01-06T16:00:00Z → 2025-01-07 01:00 KST
    const date = new Date('2025-01-06T16:00:00Z');
    expect(formatDateInKoreanTimezone(date)).toBe('2025-01-07');
  });

  it('pads single-digit months and days with zero', () => {
    const date = new Date('2025-03-05T12:00:00+09:00');
    expect(formatDateInKoreanTimezone(date)).toBe('2025-03-05');
  });
});

describe('getTimeRange', () => {
  it('returns the current Monday as the end-week origin when today is Monday', () => {
    const monday = localNoon(2025, 0, 6); // Mon 2025-01-06
    const { weeksAgo, today } = getTimeRange(monday);
    expect(today).toBe(monday);
    // Current Monday is Jan 6; gridStart = Jan 6 - 21 days = Dec 16, 2024
    expect(weeksAgo.getFullYear()).toBe(2024);
    expect(weeksAgo.getMonth()).toBe(11);
    expect(weeksAgo.getDate()).toBe(16);
    expect(weeksAgo.getHours()).toBe(0);
    expect(weeksAgo.getMinutes()).toBe(0);
  });

  it('rewinds Sunday to the previous Monday before computing weeksAgo', () => {
    const sunday = localNoon(2025, 0, 5); // Sun 2025-01-05
    const { weeksAgo } = getTimeRange(sunday);
    // Sun Jan 5 → current Monday is Dec 30, 2024; weeksAgo = Dec 9
    expect(weeksAgo.getFullYear()).toBe(2024);
    expect(weeksAgo.getMonth()).toBe(11);
    expect(weeksAgo.getDate()).toBe(9);
  });

  it('rewinds Friday to the same Monday as the start of its week', () => {
    const friday = localNoon(2025, 0, 10); // Fri 2025-01-10
    const { weeksAgo } = getTimeRange(friday);
    // Current Monday is Jan 6; weeksAgo = Dec 16, 2024
    expect(weeksAgo.getMonth()).toBe(11);
    expect(weeksAgo.getDate()).toBe(16);
  });

  it('rewinds Saturday to the Monday of the same week', () => {
    const saturday = localNoon(2025, 0, 11); // Sat 2025-01-11
    const { weeksAgo } = getTimeRange(saturday);
    expect(weeksAgo.getMonth()).toBe(11);
    expect(weeksAgo.getDate()).toBe(16);
  });

  it('normalizes weeksAgo to midnight even when today is at noon', () => {
    const { weeksAgo } = getTimeRange(localNoon(2025, 0, 6));
    expect(weeksAgo.getHours()).toBe(0);
    expect(weeksAgo.getMinutes()).toBe(0);
    expect(weeksAgo.getSeconds()).toBe(0);
    expect(weeksAgo.getMilliseconds()).toBe(0);
  });

  it('does not mutate the today argument', () => {
    const monday = localNoon(2025, 0, 6);
    const snapshot = monday.getTime();
    getTimeRange(monday);
    expect(monday.getTime()).toBe(snapshot);
  });
});

describe('filterContributionsInTimeRange', () => {
  const start = new Date('2025-01-06T00:00:00Z');
  const end = new Date('2025-01-10T00:00:00Z');

  it('includes contributions on both range bounds', () => {
    const contributions = [
      { createdAt: '2025-01-06T00:00:00Z' },
      { createdAt: '2025-01-10T00:00:00Z' },
    ];
    expect(filterContributionsInTimeRange(contributions, start, end)).toHaveLength(2);
  });

  it('includes a contribution inside the range', () => {
    const contributions = [{ createdAt: '2025-01-08T12:00:00Z' }];
    expect(filterContributionsInTimeRange(contributions, start, end)).toHaveLength(1);
  });

  it('excludes a contribution before the start', () => {
    const contributions = [{ createdAt: '2025-01-05T23:59:59Z' }];
    expect(filterContributionsInTimeRange(contributions, start, end)).toEqual([]);
  });

  it('excludes a contribution after the end', () => {
    const contributions = [{ createdAt: '2025-01-10T00:00:01Z' }];
    expect(filterContributionsInTimeRange(contributions, start, end)).toEqual([]);
  });

  it('returns empty for empty input', () => {
    expect(filterContributionsInTimeRange([], start, end)).toEqual([]);
  });
});

describe('isDateWithinTodayInclusive', () => {
  it('returns true when date and today are the same KST day', () => {
    const date = new Date('2025-01-06T03:00:00+09:00');
    const today = new Date('2025-01-06T20:00:00+09:00');
    expect(isDateWithinTodayInclusive(date, today)).toBe(true);
  });

  it('returns true when date is before today in KST', () => {
    const date = new Date('2025-01-05T20:00:00+09:00');
    const today = new Date('2025-01-06T03:00:00+09:00');
    expect(isDateWithinTodayInclusive(date, today)).toBe(true);
  });

  it('returns false when date is after today in KST', () => {
    const date = new Date('2025-01-07T03:00:00+09:00');
    const today = new Date('2025-01-06T20:00:00+09:00');
    expect(isDateWithinTodayInclusive(date, today)).toBe(false);
  });

  it('compares by KST calendar day, not absolute timestamp', () => {
    // date is later in absolute time but earlier in KST day:
    //   today: 2025-01-06T16:00:00Z → 2025-01-07 01:00 KST
    //   date:  2025-01-06T20:00:00Z → 2025-01-07 05:00 KST → same day → true
    const date = new Date('2025-01-06T20:00:00Z');
    const today = new Date('2025-01-06T16:00:00Z');
    expect(isDateWithinTodayInclusive(date, today)).toBe(true);
  });
});
