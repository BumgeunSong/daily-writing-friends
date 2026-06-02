import * as Sentry from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { fetchUser } from '@/user/api/user';
import type { User } from '@/user/model/User';

// uid로 User를 가져오는 React Query 훅 (서버가 단일 진실 원천)
export function useUser(uid: string | null | undefined) {
  const noUserIdError = !uid
    ? new Error('유저 ID가 존재하지 않아 유저 데이터를 불러올 수 없습니다.')
    : null;
  const isEnabled = !!uid;

  const { data, isLoading, error } = useQuery<User | null>(
    ['user', uid],
    async () => {
      if (!uid) throw new Error('유저 ID가 존재하지 않아 유저 데이터를 불러올 수 없습니다.');
      return fetchUser(uid);
    },
    {
      enabled: isEnabled,
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
