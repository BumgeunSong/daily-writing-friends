import { describe, expect, it } from 'vitest';
import { generateMockContributions, mockStatsShowcase } from './mockUserStats';

const FOUR_WEEKS_IN_DAYS = 28;
const MIN_FILLED_DAYS = 12;
const MIN_DISTINCT_LENGTHS = 4;

/** Parse a "YYYY-MM-DD" string as a local calendar date, matching how the generator builds it. */
function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

describe('generateMockContributions', () => {
  describe('when generating from a fixed weekday', () => {
    const today = new Date(2026, 6, 15); // 2026-07-15 (수)

    it('produces only weekday (Mon–Fri) dates', () => {
      const contributions = generateMockContributions(today);
      const everyDateIsWeekday = contributions.every((contribution) => {
        const dayOfWeek = parseLocalDate(contribution.createdAt).getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5;
      });
      expect(everyDateIsWeekday).toBe(true);
    });

    it('never produces a date in the future', () => {
      const contributions = generateMockContributions(today);
      const todayISO = toLocalISODate(today);
      const everyDateIsPastOrToday = contributions.every(
        (contribution) => contribution.createdAt <= todayISO,
      );
      expect(everyDateIsPastOrToday).toBe(true);
    });

    it('keeps every date within the grid window (last four weeks)', () => {
      const contributions = generateMockContributions(today);
      const earliest = new Date(today);
      earliest.setDate(today.getDate() - FOUR_WEEKS_IN_DAYS);
      const earliestISO = toLocalISODate(earliest);
      const everyDateIsWithinWindow = contributions.every(
        (contribution) => contribution.createdAt >= earliestISO,
      );
      expect(everyDateIsWithinWindow).toBe(true);
    });

    it('fills enough days with varied content lengths for a lively grid', () => {
      const contributions = generateMockContributions(today);
      const distinctLengths = new Set(contributions.map((contribution) => contribution.contentLength));
      expect(contributions.length).toBeGreaterThanOrEqual(MIN_FILLED_DAYS);
      expect(distinctLengths.size).toBeGreaterThanOrEqual(MIN_DISTINCT_LENGTHS);
    });
  });
});

describe('mockStatsShowcase', () => {
  it('exposes three distinctly-named profiles', () => {
    const names = mockStatsShowcase.map((stats) => stats.user.nickname);
    expect(names).toEqual(['매생이', '매글이', '매일이']);
  });

  it('orders profiles from densest to sparsest grid', () => {
    const filledCounts = mockStatsShowcase.map((stats) => stats.contributions.length);
    const [fullStreak, realistic, rare] = filledCounts;
    expect(fullStreak).toBeGreaterThan(realistic);
    expect(realistic).toBeGreaterThan(rare);
  });
});
