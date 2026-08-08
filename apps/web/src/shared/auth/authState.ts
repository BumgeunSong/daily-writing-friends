import type { AuthUser } from './authTypes';

/**
 * The authentication lifecycle as a discriminated union.
 *
 * Each state names its meaning and carries only the values valid in that state,
 * so illegal combinations cannot be represented:
 * - `restoring` holds a `cachedUser` restored from storage but NOT yet verified
 *   by Supabase. It is deliberately named differently from `signedIn.user` so
 *   that reading an unverified identity has to be spelled out on purpose.
 * - `signedIn` holds a `user` whose session Supabase has verified.
 * - `checking` and `signedOut` carry no user, so consumers cannot read one where
 *   none exists.
 */
export type AuthState =
  | { status: 'restoring'; cachedUser: AuthUser }
  | { status: 'checking' }
  | { status: 'signedIn'; user: AuthUser }
  | { status: 'signedOut' };

/** Compile-time exhaustiveness guard: a new AuthState variant fails to build at the call site. */
export function assertNever(state: never): never {
  throw new Error(`Unhandled auth state: ${JSON.stringify(state)}`);
}

/**
 * Initial state before Supabase resolves the session, derived from whatever
 * identity was cached in storage: a cached user starts in `restoring`, no cache
 * starts in `checking`.
 */
export function initialAuthState(cachedUser: AuthUser | null): AuthState {
  return cachedUser ? { status: 'restoring', cachedUser } : { status: 'checking' };
}

/** State after Supabase resolves the session, on first load or any later change. */
export function resolvedAuthState(user: AuthUser | null): AuthState {
  return user ? { status: 'signedIn', user } : { status: 'signedOut' };
}

/**
 * The identity to show for first paint and display: the verified user when
 * signed in, or the cached user while restoring; null while checking or signed
 * out. This is the backward-compatible `currentUser`; it does not distinguish
 * verified from cached, so gates that require verification must read
 * {@link verifiedUserOf} instead.
 */
export function currentUserOf(state: AuthState): AuthUser | null {
  switch (state.status) {
    case 'restoring':
      return state.cachedUser;
    case 'signedIn':
      return state.user;
    case 'checking':
    case 'signedOut':
      return null;
    default:
      return assertNever(state);
  }
}

/**
 * The user only when their session is verified; null while restoring (cached but
 * unverified), checking, or signed out. Gates that open private content or
 * authorize writes read this, never {@link currentUserOf}.
 */
export function verifiedUserOf(state: AuthState): AuthUser | null {
  return state.status === 'signedIn' ? state.user : null;
}

/** Whether Supabase verification is still pending (cache restore or first check). */
export function isAuthLoading(state: AuthState): boolean {
  switch (state.status) {
    case 'restoring':
    case 'checking':
      return true;
    case 'signedIn':
    case 'signedOut':
      return false;
    default:
      return assertNever(state);
  }
}
