import { describe, it, expect } from 'vitest';
import { calculateIntensity } from './ContributionItem';

const INTENSITY_HOLIDAY = -2;
const INTENSITY_NONE = 0;
const INTENSITY_MIN_ACTIVE = 1;

describe('calculateIntensity', () => {
  it('returns the holiday level regardless of value', () => {
    expect(calculateIntensity(500, 500, true)).toBe(INTENSITY_HOLIDAY);
    expect(calculateIntensity(null, 500, true)).toBe(INTENSITY_HOLIDAY);
  });

  it('returns none for a no-activity day (null)', () => {
    expect(calculateIntensity(null, 500, false)).toBe(INTENSITY_NONE);
  });

  it('returns the lowest active level for a posted-but-empty day (0)', () => {
    // Regression for #291: a 0-length post is still an active day, not a gap.
    expect(calculateIntensity(0, 500, false)).toBe(INTENSITY_MIN_ACTIVE);
  });

  it('scales magnitude into 1..4 levels relative to maxValue', () => {
    expect(calculateIntensity(500, 500, false)).toBe(4);
    expect(calculateIntensity(250, 500, false)).toBe(2);
    expect(calculateIntensity(1, 500, false)).toBe(1);
  });

  it('never divides by zero when maxValue is 0', () => {
    expect(calculateIntensity(0, 0, false)).toBe(INTENSITY_MIN_ACTIVE);
  });
});
