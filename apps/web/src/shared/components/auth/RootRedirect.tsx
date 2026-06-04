import { Navigate } from '@/shared/navigation';
import { useIsCurrentUserActive } from '@/login/hooks/useIsCurrentUserActive';
import { useIsUserInWaitingList } from '@/login/hooks/useIsUserInWaitingList';
import { useOnboardingComplete } from '@/login/hooks/useOnboardingComplete';
import { useAuth } from '@/shared/hooks/useAuth';
import { SESSION_KEYS, sessionStore } from '@/shared/lib/storage';
import { resolveRootRedirect } from '@/shared/utils/routingDecisions';

/**
 * Root redirect component — thin shell over resolveRootRedirect.
 * Unauthenticated users go to JoinIntroPage (official landing page).
 */
export function RootRedirect() {
  const { currentUser, loading: authLoading } = useAuth();
  const { isCurrentUserActive, isLoading: activeUserLoading } = useIsCurrentUserActive();
  const { isInWaitingList, isLoading: waitingListLoading } = useIsUserInWaitingList();
  const { onboardingComplete, isLoading: onboardingLoading } = useOnboardingComplete(currentUser?.uid);

  const returnTo = sessionStore.get(SESSION_KEYS.RETURN_TO);

  const result = resolveRootRedirect({
    currentUser,
    isLoading: authLoading || activeUserLoading || waitingListLoading || onboardingLoading,
    isCurrentUserActive,
    isInWaitingList: Boolean(isInWaitingList),
    onboardingComplete,
    returnTo,
  });

  if (result.type === 'loading') return null;

  if (returnTo) sessionStore.remove(SESSION_KEYS.RETURN_TO);

  return <Navigate to={result.to} replace />;
}
