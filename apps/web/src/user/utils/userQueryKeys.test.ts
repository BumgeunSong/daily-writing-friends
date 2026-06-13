import { describe, it, expect } from 'vitest';
import { userQueryKey } from './userQueryKeys';

describe('userQueryKey', () => {
  it('returns the canonical [user, uid] tuple for a real uid', () => {
    expect(userQueryKey('u1')).toEqual(['user', 'u1']);
  });

  it('accepts null without throwing (callers commonly pass currentUser?.uid)', () => {
    expect(userQueryKey(null)).toEqual(['user', null]);
  });

  it('accepts undefined without throwing', () => {
    expect(userQueryKey(undefined)).toEqual(['user', undefined]);
  });
});
