import { useQuery } from '@tanstack/react-query';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
import { fetchUsersWithBoardPermission } from '@/user/api/user';

/**
 * 현재 활성 보드의 write 권한을 가진 유저 수를 반환하는 커스텀 훅
 * @returns { data, isLoading, error }
 */
export function useActiveUser() {
  const { value: activeBoardId } = useRemoteConfig('active_board_id');

  const {
    data: users,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['activeUserCount', activeBoardId],
    queryFn: () =>
      activeBoardId ? fetchUsersWithBoardPermission([activeBoardId]) : Promise.resolve([]),
    enabled: !!activeBoardId,
  });

  return {
    data: users,
    isLoading,
    error
  };
} 