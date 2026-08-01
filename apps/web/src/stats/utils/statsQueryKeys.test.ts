import { describe, it, expect } from 'vitest';
import { badgeQueryKey, streakQueryKey } from './statsQueryKeys';

describe('statsQueryKeys', () => {
  it('badgeQueryKey returns the canonical [postProfileBadges, userId] tuple', () => {
    expect(badgeQueryKey('u1')).toEqual(['postProfileBadges', 'u1']);
  });

  it('streakQueryKey returns the canonical [postingStreak, userId] tuple', () => {
    expect(streakQueryKey('u1')).toEqual(['postingStreak', 'u1']);
  });
});
