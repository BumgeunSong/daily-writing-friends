import { Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { useIsCurrentUserActive } from '@/login/hooks/useIsCurrentUserActive';
import { useIsUserInWaitingList } from '@/login/hooks/useIsUserInWaitingList';

/**
 * Root redirect component
 * Handles the root path based on auth state
 * Unauthenticated users go to JoinIntroPage (official landing page)
 */
export function RootRedirect() {
  const { currentUser, loading: authLoading } = useAuth();
  const { isCurrentUserActive } = useIsCurrentUserActive();
  const { isInWaitingList, isLoading: waitingListLoading } = useIsUserInWaitingList();

  const isLoading = authLoading || waitingListLoading || isCurrentUserActive === undefined;

  if (isLoading) {
    return null;
  }

  if (!currentUser) {
    return <Navigate to="/join" replace />;
  }

  if (isCurrentUserActive) {
    return <Navigate to="/boards" replace />;
  }

  if (isInWaitingList) {
    return <Navigate to="/join/form" replace />;
  }

  return <Navigate to="/join" replace />;
}