import { describe, it, expect } from 'vitest';
import type { AuthUser } from '@/shared/auth/authTypes';
import { isSafeReturnTo, resolveRootRedirect, resolvePrivateRoute } from './routingDecisions';

const activeUser = { uid: 'user-1', displayName: '홍길동' };
const authUser: AuthUser = { uid: 'user-1', email: null, displayName: '홍길동', photoURL: null };

describe('resolveRootRedirect', () => {
  const defaults = {
    currentUser: activeUser,
    isLoading: false,
    isCurrentUserActive: false,
    isInWaitingList: false,
    onboardingComplete: false,
    returnTo: null,
  };

  it('returns loading while auth or data is loading', () => {
    expect(resolveRootRedirect({ ...defaults, isLoading: true }))
      .toEqual({ type: 'loading' });
  });

  it('redirects to /join when not logged in', () => {
    expect(resolveRootRedirect({ ...defaults, currentUser: null }))
      .toEqual({ type: 'navigate', to: '/join' });
  });

  it('redirects to returnTo path when present', () => {
    expect(resolveRootRedirect({ ...defaults, returnTo: '/board/abc-123' }))
      .toEqual({ type: 'navigate', to: '/board/abc-123' });
  });

  it('returnTo takes priority over active-user redirect', () => {
    expect(resolveRootRedirect({ ...defaults, isCurrentUserActive: true, returnTo: '/join' }))
      .toEqual({ type: 'navigate', to: '/join' });
  });

  it('redirects active user to /boards when no returnTo', () => {
    expect(resolveRootRedirect({ ...defaults, isCurrentUserActive: true, onboardingComplete: true }))
      .toEqual({ type: 'navigate', to: '/boards' });
  });

  it('redirects waiting-list user to /boards (no inline JoinComplete)', () => {
    expect(resolveRootRedirect({ ...defaults, isInWaitingList: true, onboardingComplete: true }))
      .toEqual({ type: 'navigate', to: '/boards' });
  });

  it('routes not-onboarded user to /join/onboarding regardless of provider', () => {
    expect(resolveRootRedirect({ ...defaults, onboardingComplete: false }))
      .toEqual({ type: 'navigate', to: '/join/onboarding' });
  });

  it('routes onboarded but inactive non-waitlist user to /join', () => {
    expect(resolveRootRedirect({ ...defaults, onboardingComplete: true }))
      .toEqual({ type: 'navigate', to: '/join' });
  });

  it('rejects absolute URL as returnTo (open redirect prevention)', () => {
    expect(resolveRootRedirect({ ...defaults, isCurrentUserActive: true, returnTo: 'https://evil.com', onboardingComplete: true }))
      .toEqual({ type: 'navigate', to: '/boards' });
  });

  it('rejects protocol-relative URL as returnTo', () => {
    expect(resolveRootRedirect({ ...defaults, isCurrentUserActive: true, returnTo: '//evil.com', onboardingComplete: true }))
      .toEqual({ type: 'navigate', to: '/boards' });
  });

  it('ignores stale returnTo for unauthenticated user', () => {
    expect(resolveRootRedirect({ ...defaults, currentUser: null, returnTo: '/boards' }))
      .toEqual({ type: 'navigate', to: '/join' });
  });
});

describe('resolvePrivateRoute', () => {
  it('allows a verified (signedIn) user through', () => {
    expect(resolvePrivateRoute({ authState: { status: 'signedIn', user: authUser }, pathname: '/boards' }))
      .toEqual({ type: 'allow' });
  });

  it('waits while checking the session with no cache', () => {
    expect(resolvePrivateRoute({ authState: { status: 'checking' }, pathname: '/boards' }))
      .toEqual({ type: 'loading' });
  });

  it('waits while restoring a cached user, never allowing access from an unverified cache', () => {
    expect(resolvePrivateRoute({ authState: { status: 'restoring', cachedUser: authUser }, pathname: '/boards' }))
      .toEqual({ type: 'loading' });
  });

  it('redirects a signed-out user and saves the deep-link path', () => {
    expect(resolvePrivateRoute({ authState: { status: 'signedOut' }, pathname: '/board/abc-123' }))
      .toEqual({ type: 'redirect', returnToPath: '/board/abc-123' });
  });

  it('redirects a signed-out user without saving /login as returnTo', () => {
    expect(resolvePrivateRoute({ authState: { status: 'signedOut' }, pathname: '/login' }))
      .toEqual({ type: 'redirect', returnToPath: null });
  });
});

describe('isSafeReturnTo', () => {
  it('accepts relative paths', () => {
    expect(isSafeReturnTo('/boards')).toBe(true);
    expect(isSafeReturnTo('/board/abc-123')).toBe(true);
    expect(isSafeReturnTo('/join/form')).toBe(true);
  });

  it('rejects null', () => {
    expect(isSafeReturnTo(null)).toBe(false);
  });

  it('rejects absolute URLs', () => {
    expect(isSafeReturnTo('https://evil.com')).toBe(false);
    expect(isSafeReturnTo('http://evil.com/boards')).toBe(false);
  });

  it('rejects protocol-relative URLs', () => {
    expect(isSafeReturnTo('//evil.com')).toBe(false);
  });

  it('rejects non-path strings', () => {
    expect(isSafeReturnTo('javascript:alert(1)')).toBe(false);
    expect(isSafeReturnTo('')).toBe(false);
  });
});
