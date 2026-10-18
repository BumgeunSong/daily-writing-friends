import { describe, expect, it } from 'vitest';
import {
  currentUserOf,
  initialAuthState,
  isAuthLoading,
  resolvedAuthState,
  verifiedUserOf,
} from './authState';
import type { AuthUser } from './authTypes';

const user: AuthUser = { uid: 'u1', email: 'a@b.com', displayName: 'A', photoURL: null };

describe('initialAuthState', () => {
  it('restores a cached user as unverified (restoring)', () => {
    expect(initialAuthState(user)).toEqual({ status: 'restoring', cachedUser: user });
  });

  it('starts checking when there is no cache', () => {
    expect(initialAuthState(null)).toEqual({ status: 'checking' });
  });
});

describe('resolvedAuthState', () => {
  it('is signedIn with the verified user', () => {
    expect(resolvedAuthState(user)).toEqual({ status: 'signedIn', user });
  });

  it('is signedOut without a user', () => {
    expect(resolvedAuthState(null)).toEqual({ status: 'signedOut' });
  });
});

describe('currentUserOf (cached-or-verified identity)', () => {
  it('returns the cached user while restoring', () => {
    expect(currentUserOf({ status: 'restoring', cachedUser: user })).toBe(user);
  });

  it('returns the verified user when signed in', () => {
    expect(currentUserOf({ status: 'signedIn', user })).toBe(user);
  });

  it('is null while checking and when signed out', () => {
    expect(currentUserOf({ status: 'checking' })).toBeNull();
    expect(currentUserOf({ status: 'signedOut' })).toBeNull();
  });
});

describe('verifiedUserOf (verified-only identity)', () => {
  it('returns the user only when signed in', () => {
    expect(verifiedUserOf({ status: 'signedIn', user })).toBe(user);
  });

  it('is null while restoring, because a cached user is not yet verified', () => {
    expect(verifiedUserOf({ status: 'restoring', cachedUser: user })).toBeNull();
  });

  it('is null while checking and when signed out', () => {
    expect(verifiedUserOf({ status: 'checking' })).toBeNull();
    expect(verifiedUserOf({ status: 'signedOut' })).toBeNull();
  });
});

describe('isAuthLoading', () => {
  it('is true while restoring and checking', () => {
    expect(isAuthLoading({ status: 'restoring', cachedUser: user })).toBe(true);
    expect(isAuthLoading({ status: 'checking' })).toBe(true);
  });

  it('is false when signed in or signed out', () => {
    expect(isAuthLoading({ status: 'signedIn', user })).toBe(false);
    expect(isAuthLoading({ status: 'signedOut' })).toBe(false);
  });
});
