import { describe, expect, it } from 'vitest';
import type { User } from '@/user/model/User';
import {
  filterBlockSuggestions,
  getNextSuggestionIndex,
  isCloseSuggestionsKey,
  mapBlockedUsersFromSettled,
  MAX_SEARCH_SUGGESTIONS,
} from './blockedUsersUtils';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'u1',
    realName: null,
    nickname: 'nick',
    email: 'u1@example.com',
    profilePhotoURL: null,
    bio: null,
    phoneNumber: null,
    kakaoId: null,
    referrer: null,
    onboardingComplete: true,
    boardPermissions: {},
    updatedAt: null,
    ...overrides,
  };
}

function fulfilled(value: User | null): PromiseFulfilledResult<User | null> {
  return { status: 'fulfilled', value };
}

function rejected(reason: unknown = new Error('fail')): PromiseRejectedResult {
  return { status: 'rejected', reason };
}

describe('mapBlockedUsersFromSettled', () => {
  it('returns empty users and zero rejected for an empty batch', () => {
    expect(mapBlockedUsersFromSettled([])).toEqual({
      users: [],
      rejectedCount: 0,
      totalCount: 0,
    });
  });

  it('drops null fulfilled values (deleted users) without inflating the rejected count', () => {
    const u = makeUser({ uid: 'u1' });
    const result = mapBlockedUsersFromSettled([fulfilled(u), fulfilled(null)]);
    expect(result).toEqual({
      users: [u],
      rejectedCount: 0,
      totalCount: 2,
    });
  });

  it('counts rejected results separately so the page can tell partial-fail from total-fail', () => {
    const u1 = makeUser({ uid: 'u1' });
    const u2 = makeUser({ uid: 'u2' });
    expect(mapBlockedUsersFromSettled([fulfilled(u1), rejected(), fulfilled(u2)])).toEqual({
      users: [u1, u2],
      rejectedCount: 1,
      totalCount: 3,
    });
  });

  it('reports total-fail when every fetch rejected', () => {
    const result = mapBlockedUsersFromSettled([rejected(), rejected(), rejected()]);
    expect(result.users).toEqual([]);
    expect(result.rejectedCount).toBe(3);
    expect(result.totalCount).toBe(3);
  });
});

describe('filterBlockSuggestions', () => {
  const me = 'me-uid';
  const blocked = makeUser({ uid: 'blocked-uid' });

  it('returns empty when the search query is blank', () => {
    expect(filterBlockSuggestions([makeUser()], [], me, '')).toEqual([]);
    expect(filterBlockSuggestions([makeUser()], [], me, '   ')).toEqual([]);
  });

  it('returns empty when there is no search result', () => {
    expect(filterBlockSuggestions(null, [], me, 'query')).toEqual([]);
    expect(filterBlockSuggestions(undefined, [], me, 'query')).toEqual([]);
  });

  it('wraps a single-user result into an array', () => {
    const u = makeUser({ uid: 'u1' });
    expect(filterBlockSuggestions(u, [], me, 'q')).toEqual([u]);
  });

  it('excludes the current user', () => {
    const meUser = makeUser({ uid: me });
    const other = makeUser({ uid: 'other' });
    expect(filterBlockSuggestions([meUser, other], [], me, 'q')).toEqual([other]);
  });

  it('excludes users already blocked', () => {
    const fresh = makeUser({ uid: 'fresh' });
    expect(filterBlockSuggestions([blocked, fresh], [blocked], me, 'q')).toEqual([fresh]);
  });

  it(`caps results at MAX_SEARCH_SUGGESTIONS (${MAX_SEARCH_SUGGESTIONS})`, () => {
    const many = Array.from({ length: 12 }, (_, i) => makeUser({ uid: `u${i}` }));
    const result = filterBlockSuggestions(many, [], me, 'q');
    expect(result).toHaveLength(MAX_SEARCH_SUGGESTIONS);
    expect(result[0].uid).toBe('u0');
    expect(result[MAX_SEARCH_SUGGESTIONS - 1].uid).toBe(`u${MAX_SEARCH_SUGGESTIONS - 1}`);
  });
});

describe('getNextSuggestionIndex', () => {
  it('increments on ArrowDown without an upper clamp (matches original behavior)', () => {
    expect(getNextSuggestionIndex(0, 'ArrowDown')).toBe(1);
    expect(getNextSuggestionIndex(99, 'ArrowDown')).toBe(100);
  });

  it('decrements on ArrowUp, clamped to 0', () => {
    expect(getNextSuggestionIndex(3, 'ArrowUp')).toBe(2);
    expect(getNextSuggestionIndex(0, 'ArrowUp')).toBe(0);
    expect(getNextSuggestionIndex(-1, 'ArrowUp')).toBe(0);
  });

  it('returns null for any non-arrow key (no index change)', () => {
    for (const key of ['Enter', 'Escape', 'Tab', 'a', '']) {
      expect(getNextSuggestionIndex(0, key)).toBeNull();
    }
  });
});

describe('isCloseSuggestionsKey', () => {
  it('returns true only for Escape', () => {
    expect(isCloseSuggestionsKey('Escape')).toBe(true);
    for (const key of ['Enter', 'ArrowDown', 'ArrowUp', 'Tab', ' ', '']) {
      expect(isCloseSuggestionsKey(key)).toBe(false);
    }
  });
});
