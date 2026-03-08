import { describe, it, expect } from 'vitest';
import { computeWeekDaysFromFirstDay } from './supabaseReads';

describe('computeWeekDaysFromFirstDay', () => {
  it('returns 0 for same-day post', () => {
    // Monday Jan 12 2026
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
    // Mon Jan 12 → Mon Jan 26 = 10 working days
    expect(computeWeekDaysFromFirstDay('2026-01-12T00:00:00Z', '2026-01-26T00:00:00Z')).toBe(10);
  });

  it('handles cross-month boundary', () => {
    // Mon Jan 26 → Mon Feb 2 = 5 working days
    expect(computeWeekDaysFromFirstDay('2026-01-26T00:00:00Z', '2026-02-02T00:00:00Z')).toBe(5);
  });

  it('handles cross-year boundary', () => {
    // Mon Dec 29 2025 → Fri Jan 2 2026 = 4 working days (Mon, Tue, Wed, Thu)
    expect(computeWeekDaysFromFirstDay('2025-12-29T00:00:00Z', '2026-01-02T00:00:00Z')).toBe(4);
  });

  it('handles start on weekend correctly', () => {
    // Sat Jan 10 → Mon Jan 12 = 0 working days (Sat, Sun are skipped)
    expect(computeWeekDaysFromFirstDay('2026-01-10T00:00:00Z', '2026-01-12T00:00:00Z')).toBe(0);
  });

  it('handles KST date boundary (late UTC = next day in KST)', () => {
    // UTC 15:00 on Sunday Jan 11 = KST 00:00 on Monday Jan 12
    // Mon Jan 12 KST → Wed Jan 14 KST = 2 working days
    expect(computeWeekDaysFromFirstDay('2026-01-11T15:00:00Z', '2026-01-14T00:00:00Z')).toBe(2);
  });
});
