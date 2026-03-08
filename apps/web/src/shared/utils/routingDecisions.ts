/**
 * Pure routing decision functions.
 * Components call these and render the result — no side effects here.
 */

/** Reject absolute URLs, protocol-relative URLs, and non-path strings. */
export function isSafeReturnTo(value: string | null): boolean {
  if (!value) return false;
  return value.startsWith('/') && !value.startsWith('//');
}

export type RootRedirectResult =
  | { type: 'loading' }
  | { type: 'navigate'; to: string }
  | { type: 'joinComplete'; userName: string; cohort: number };

interface RootRedirectInput {
  currentUser: { displayName: string | null } | null;
  isLoading: boolean;
  isCurrentUserActive: boolean;
  isInWaitingList: boolean;
  isNicknameLoading: boolean;
  nickname: string | null;
  cohort: number;
  returnTo: string | null;
}

export function resolveRootRedirect(input: RootRedirectInput): RootRedirectResult {
  if (input.isLoading) return { type: 'loading' };

  if (!input.currentUser) return { type: 'navigate', to: '/join' };

  if (isSafeReturnTo(input.returnTo)) return { type: 'navigate', to: input.returnTo! };

  if (input.isCurrentUserActive) return { type: 'navigate', to: '/boards' };

  if (input.isInWaitingList) {
    if (input.isNicknameLoading) return { type: 'loading' };
    const userName = input.nickname || input.currentUser.displayName || '';
    return { type: 'joinComplete', userName, cohort: input.cohort };
  }

  return { type: 'navigate', to: '/join' };
}

export type PrivateRouteResult =
  | { type: 'loading' }
  | { type: 'redirect'; returnToPath: string | null }
  | { type: 'allow' };

interface PrivateRouteInput {
  currentUser: { uid: string } | null;
  loading: boolean;
  pathname: string;
}

export function resolvePrivateRoute(input: PrivateRouteInput): PrivateRouteResult {
  if (input.loading) return { type: 'loading' };

  if (!input.currentUser) {
    const returnToPath = input.pathname !== '/login' ? input.pathname : null;
    return { type: 'redirect', returnToPath };
  }

  return { type: 'allow' };
}
