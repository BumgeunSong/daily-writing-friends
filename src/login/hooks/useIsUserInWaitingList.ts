import { useAuth } from '@/shared/hooks/useAuth';
import { useUpcomingBoard } from './useUpcomingBoard';

export function useIsUserInWaitingList() {
  const { currentUser } = useAuth();
  const { data: upcomingBoard, isLoading: isBoardLoading } = useUpcomingBoard();

  const isInWaitingList = currentUser && upcomingBoard
    ? upcomingBoard.waitingUsersIds.includes(currentUser.uid)
    : false;

  return {
    isInWaitingList,
    isLoading: isBoardLoading,
  };
}
