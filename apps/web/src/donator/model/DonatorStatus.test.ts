import { describe, it, expect } from 'vitest';
import {
  isDonatorActive,
  mapDonatorStatusRow,
  type DonatorStatusRow,
} from './DonatorStatus';

describe('mapDonatorStatusRow', () => {
  it('converts snake_case row to typed Date fields', () => {
    const row: DonatorStatusRow = {
      user_id: 'u1',
      latest_donated_at: '2026-05-01T00:00:00Z',
      active_until: '2026-05-31T00:00:00Z',
      donation_count: 3,
    };
    const status = mapDonatorStatusRow(row);
    expect(status.userId).toBe('u1');
    expect(status.donationCount).toBe(3);
    expect(status.latestDonatedAt.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(status.activeUntil.toISOString()).toBe('2026-05-31T00:00:00.000Z');
  });
});

describe('isDonatorActive', () => {
  it('returns false when activeUntil is undefined', () => {
    expect(isDonatorActive(undefined, new Date('2026-05-05'))).toBe(false);
  });

  it('returns true when activeUntil is after now', () => {
    expect(isDonatorActive(new Date('2026-05-31'), new Date('2026-05-05'))).toBe(true);
  });

  it('returns false when activeUntil equals now', () => {
    const same = new Date('2026-05-05');
    expect(isDonatorActive(same, same)).toBe(false);
  });

  it('returns false when activeUntil is in the past', () => {
    expect(isDonatorActive(new Date('2026-04-01'), new Date('2026-05-05'))).toBe(false);
  });
});
