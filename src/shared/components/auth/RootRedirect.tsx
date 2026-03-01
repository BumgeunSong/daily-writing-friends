import { Navigate } from 'react-router-dom';
import JoinCompletePage from '@/login/components/JoinCompletePage';
import { useIsCurrentUserActive } from '@/login/hooks/useIsCurrentUserActive';
import { useIsUserInWaitingList } from '@/login/hooks/useIsUserInWaitingList';
import { useUpcomingBoard } from '@/login/hooks/useUpcomingBoard';
import { useAuth } from '@/shared/hooks/useAuth';
import { resolveRootRedirect } from '@/shared/utils/routingDecisions';
import { useUserNickname } from '@/user/hooks/useUserNickname';

/**
 * Root redirect component — thin shell over resolveRootRedirect.
 * Unauthenticated users go to JoinIntroPage (official landing page).
 */
export function RootRedirect() {
  const { currentUser, loading: authLoading } = useAuth();
  const { isCurrentUserActive, isLoading: activeUserLoading } = useIsCurrentUserActive();
  const { isInWaitingList, isLoading: waitingListLoading } = useIsUserInWaitingList();
  const { nickname, isLoading: nicknameLoading } = useUserNickname(currentUser?.uid);
  const { data: upcomingBoard, isLoading: isBoardLoading } = useUpcomingBoard();

  const returnTo = sessionStorage.getItem('returnTo');

  const result = resolveRootRedirect({
    currentUser,
    isLoading: authLoading || activeUserLoading || waitingListLoading || isBoardLoading,
    isCurrentUserActive,
    isInWaitingList,
    isNicknameLoading: nicknameLoading,
    nickname: nickname ?? null,
    cohort: upcomingBoard?.cohort || 0,
    returnTo,
  });

  if (result.type === 'loading') return null;

  // Clear returnTo unconditionally once routing decision is made
  if (returnTo) sessionStorage.removeItem('returnTo');

  if (result.type === 'navigate') {
    return <Navigate to={result.to} replace />;
  }

  return <JoinCompletePage name={result.userName} cohort={result.cohort} />;
}