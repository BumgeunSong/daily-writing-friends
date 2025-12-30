import { useQuery } from '@tanstack/react-query';
import { fetchUsersWithBoardPermission } from '@/user/api/user';
import { User } from '@/user/model/User';

export function useUserInBoard(boardIds: string[]) {
  const { data, isLoading, error } = useQuery<User[]>(
    ['usersWithBoardPermission', boardIds],
    () => fetchUsersWithBoardPermission(boardIds),
    {
      enabled: boardIds.length > 0,
      // User list rarely changes - cache aggressively
      staleTime: 10 * 60 * 1000, // 10분 동안 fresh 유지
      cacheTime: 60 * 60 * 1000, // 1시간 동안 캐시 유지
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  return { users: data ?? [], isLoading, error };
} 