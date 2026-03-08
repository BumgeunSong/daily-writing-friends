import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/shared/hooks/useAuth';
import { getBlockedByUsers } from '@/user/api/user';

/**
 * 나를 차단한 유저 목록을 React Query로 관리하는 훅.
 * 여러 컴포넌트에서 동시에 호출해도 단일 요청으로 처리됩니다.
 */
export function useBlockedByUsers(): string[] {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;

  const { data = [] } = useQuery<string[]>({
    queryKey: ['blockedByUsers', userId],
    queryFn: () => {
      if (!userId) throw new Error('userId is required');
      return getBlockedByUsers(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
  });

  return data;
}
