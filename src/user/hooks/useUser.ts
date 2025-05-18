import * as Sentry from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { fetchUser } from '@/user/api/user';
import { getCachedUserData, cacheUserData } from '@/user/cache/userCache';
import { User } from '@/user/model/User';

// uid로 User를 가져오는 React Query 훅 (캐시 우선)
export function useUser(uid: string | null) {
  const noUserIdError = uid === null ? new Error('유저 ID가 존재하지 않아 유저 데이터를 불러올 수 없습니다.') : null;

  const cached = uid ? getCachedUserData(uid) : null;
  const { data, isLoading, error } = useQuery<User | null>(
    ['user', uid],
    async () => {
      if (uid === null) throw noUserIdError;
      const cached = getCachedUserData(uid);
      const user = await fetchUser(uid);
      // updatedAt 비교: Firestore 데이터가 더 최신이면 캐시 갱신
      if (
        user &&
        (
          !cached ||
          !user.updatedAt ||
          !cached.updatedAt ||
          user.updatedAt.toMillis() > cached.updatedAt.toMillis()
        )
      ) {
        cacheUserData(uid, user);
        return user;
      }
      // 캐시가 더 최신이거나, user가 없으면 캐시 반환
      return cached;
    },
    {
      enabled: uid !== null,
      initialData: cached ?? undefined,
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
