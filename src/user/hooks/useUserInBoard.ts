import { useQuery } from '@tanstack/react-query';
import { fetchUsersWithBoardPermission } from '@/user/api/user';
import { User } from '@/user/model/User';

export function useUserInBoard(boardIds: string[]) {
  const { data, isLoading, error } = useQuery<User[]>(
    ['usersWithBoardPermission', boardIds],
    () => fetchUsersWithBoardPermission(boardIds),
    {
      enabled: boardIds.length > 0,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
    }
  );

  return { users: data ?? [], isLoading, error };
} 