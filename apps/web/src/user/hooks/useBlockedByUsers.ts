import { useQuery } from '@tanstack/react-query';
import { getBlockedByUsers } from '@/user/api/user';

export function useBlockedByUsers(userId: string | undefined) {
  return useQuery({
    queryKey: ['blockedByUsers', userId],
    queryFn: () => getBlockedByUsers(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
}
