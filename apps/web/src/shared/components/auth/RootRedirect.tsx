import { Navigate } from 'react-router-dom';
import { useIsCurrentUserActive } from '@/login/hooks/useIsCurrentUserActive';
import { useIsUserInWaitingList } from '@/login/hooks/useIsUserInWaitingList';
import { useOnboardingComplete } from '@/login/hooks/useOnboardingComplete';
import { useAuth } from '@/shared/hooks/useAuth';
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

  const returnTo = sessionStorage.getItem('returnTo');

  const result = resolveRootRedirect({
    currentUser,
    isLoading: authLoading || activeUserLoading || waitingListLoading || onboardingLoading,
    isCurrentUserActive,
    isInWaitingList: Boolean(isInWaitingList),
    onboardingComplete,
    returnTo,
  });

  if (result.type === 'loading') return null;

  if (returnTo) sessionStorage.removeItem('returnTo');

  return <Navigate to={result.to} replace />;
}
