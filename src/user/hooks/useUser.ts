import * as Sentry from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { fetchUser } from '@/user/api/user';
import { getCachedUserData, cacheUserData } from '@/user/cache/userCache';
import type { User } from '@/user/model/User';

const USER_CACHE_VERSION = 'v2';

// uid로 User를 가져오는 React Query 훅 (캐시 우선)
export function useUser(uid: string | null | undefined) {
  const noUserIdError = !uid
    ? new Error('유저 ID가 존재하지 않아 유저 데이터를 불러올 수 없습니다.')
    : null;
  const safeCacheVersion = USER_CACHE_VERSION;
  const initialData = uid ? getCachedUserData(uid, safeCacheVersion) : null;
  const isEnabled = !!uid;

  // queryKey는 항상 고정: ['user', uid, cacheVersion]
  const { data, isLoading, error } = useQuery<User | null>(
    ['user', uid, safeCacheVersion],
    async () => {
      if (!uid) throw new Error('유저 ID가 존재하지 않아 유저 데이터를 불러올 수 없습니다.');

      const user = await fetchUser(uid);

      if (user) cacheUserData(uid, user, safeCacheVersion);
      return user;
    },
    {
      enabled: isEnabled,
      initialData,
      onError: (error) => {
        console.error('유저 데이터를 불러오던 중 에러가 발생했습니다:', error);
        Sentry.captureException(error);
      },
      staleTime: 0,
      cacheTime: 1000 * 60 * 10,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    },
  );

  return { userData: data, isLoading, error: error || noUserIdError };
}
