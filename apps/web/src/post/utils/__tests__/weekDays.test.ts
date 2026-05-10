import { describe, it, expect } from 'vitest';
import { computeWeekDaysFromFirstDay } from '../weekDays';

describe('computeWeekDaysFromFirstDay', () => {
  it('returns 0 for same-day post', () => {
    expect(computeWeekDaysFromFirstDay('2026-01-12T00:00:00Z', '2026-01-12T09:00:00Z')).toBe(0);
  });

  it('counts weekdays only, excluding weekends', () => {
    // Mon Jan 12 → Fri Jan 16 = 4 working days (Mon, Tue, Wed, Thu)
    expect(computeWeekDaysFromFirstDay('2026-01-12T00:00:00Z', '2026-01-16T00:00:00Z')).toBe(4);
  });

  it('skips Saturday and Sunday', () => {
    // Mon Jan 12 → Mon Jan 19 = 5 working days (Mon-Fri, skip Sat+Sun)
    expect(computeWeekDaysFromFirstDay('2026-01-12T00:00:00Z', '2026-01-19T00:00:00Z')).toBe(5);
  });

  it('handles two full weeks', () => {
    expect(computeWeekDaysFromFirstDay('2026-01-12T00:00:00Z', '2026-01-26T00:00:00Z')).toBe(10);
  });

  it('handles cross-month boundary', () => {
    expect(computeWeekDaysFromFirstDay('2026-01-26T00:00:00Z', '2026-02-02T00:00:00Z')).toBe(5);
  });

  it('handles start on weekend correctly', () => {
    // Sat Jan 10 → Mon Jan 12 = 0 working days (Sat, Sun are skipped)
    expect(computeWeekDaysFromFirstDay('2026-01-10T00:00:00Z', '2026-01-12T00:00:00Z')).toBe(0);
  });

  it('handles cross-year boundary', () => {
    // Wed Dec 31 → Fri Jan 2 = 2 working days (Wed→Thu, Thu→Fri)
    expect(computeWeekDaysFromFirstDay('2025-12-31T00:00:00Z', '2026-01-02T00:00:00Z')).toBe(2);
  });

  it('is safe across KST/UTC boundary (KST projection)', () => {
    // First day: 2026-01-01T00:00:00+09:00 (KST) = 2025-12-31T15:00:00Z
    // Created at: 2026-01-02T00:00:01+09:00 (KST) = 2026-01-01T15:00:01Z
    // Exactly one KST weekday has elapsed between these instants.
    expect(
      computeWeekDaysFromFirstDay('2025-12-31T15:00:00Z', '2026-01-01T15:00:01Z'),
    ).toBe(1);
  });
});
