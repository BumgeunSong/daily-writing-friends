import { Navigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { useIsCurrentUserActive } from '@/login/hooks/useIsCurrentUserActive';
import { useIsUserInWaitingList } from '@/login/hooks/useIsUserInWaitingList';
import JoinCompletePage from '@/login/components/JoinCompletePage';
import { useUserNickname } from '@/user/hooks/useUserNickname';
import { useUpcomingBoard } from '@/login/hooks/useUpcomingBoard';

/**
 * Root redirect component
 * Handles the root path based on auth state
 * Unauthenticated users go to JoinIntroPage (official landing page)
 */
export function RootRedirect() {
  const { currentUser, loading: authLoading } = useAuth();
  const { isCurrentUserActive } = useIsCurrentUserActive();
  const { isInWaitingList, isLoading: waitingListLoading } = useIsUserInWaitingList();
  const { nickname, isLoading: nicknameLoading } = useUserNickname(currentUser?.uid);
  const { data: upcomingBoard } = useUpcomingBoard();

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
    if (nicknameLoading) {
      return null;
    }
    const userName = nickname || currentUser.displayName || "";
    const cohort = upcomingBoard?.cohort || 0;
    return <JoinCompletePage name={userName} cohort={cohort} />;
  }

  return <Navigate to="/join" replace />;
}