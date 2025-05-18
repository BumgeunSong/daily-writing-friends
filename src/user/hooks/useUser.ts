import * as Sentry from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { fetchUser } from '@/user/api/user';
import { getCachedUserData, cacheUserData } from '@/user/cache/userCache';
import { User } from '@/user/model/User';

// uid로 User를 가져오는 React Query 훅 (캐시 우선)
export function useUser(uid: string | null) {
  const noUserIdError = uid === null ? new Error('유저 ID가 존재하지 않아 유저 데이터를 불러올 수 없습니다.') : null;

  const { data, isLoading, error } = useQuery<User | null>(
    ['user', uid],
    async () => {
      if (uid === null) throw noUserIdError;
      const cached = getCachedUserData(uid);
      if (cached) return cached;
      const user = await fetchUser(uid);
      if (user) cacheUserData(uid, user);
      return user;
    },
    {
      enabled: uid !== null,
      onError: (error) => {
        console.error('유저 데이터를 불러오던 중 에러가 발생했습니다:', error);
        Sentry.captureException(error);
      },
      staleTime: 1000 * 60 * 5, // 5분
      cacheTime: 1000 * 60 * 10, // 10분
    }
  );

  return { userData: data, isLoading, error: error || noUserIdError };
}
