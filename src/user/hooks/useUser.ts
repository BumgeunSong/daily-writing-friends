import * as Sentry from '@sentry/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUser } from '@/user/api/user';
import { getCachedUserData, cacheUserData } from '@/user/cache/userCache';
import { User } from '@/user/model/User';
import React from 'react';
import { useRemoteConfig } from '@/shared/hooks/useRemoteConfig';

// uid로 User를 가져오는 React Query 훅 (캐시 우선)
export function useUser(uid: string | null) {
  const queryClient = useQueryClient();
  const noUserIdError = uid === null ? new Error('유저 ID가 존재하지 않아 유저 데이터를 불러올 수 없습니다.') : null;

  // 1. remote config에서 캐시 버전 받아오기
  const { value: cacheVersion, isLoading: isLoadingRemoteConfig } = useRemoteConfig<string>('user_cache_version', 'v2');

  // 2. remote config 로딩 중이면 로딩 상태 반환
  if (isLoadingRemoteConfig) {
    return { userData: null, isLoading: true, error: null };
  }

  // 3. localStorage에서 최초 데이터 읽기 (SWR: persistent cache)
  const initialData = uid ? getCachedUserData(uid, cacheVersion) : null;

  // 4. storage 이벤트로 다른 탭 동기화
  React.useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === `${cacheVersion}-user-${uid}`) {
        queryClient.invalidateQueries(['user', uid]);
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [uid, queryClient, cacheVersion]);

  const { data, isLoading, error } = useQuery<User | null>(
    ['user', uid],
    async () => {
      if (uid === null) throw noUserIdError;
      const user = await fetchUser(uid);
      if (user) cacheUserData(uid, user, cacheVersion); // 최신 데이터 도착 시 localStorage 갱신
      return user;
    },
    {
      enabled: uid !== null,
      initialData, // SWR: 첫 화면에 localStorage 데이터 사용
      onSuccess: (user) => {
        if (uid && user) cacheUserData(uid, user, cacheVersion); // 이중 안전
      },
      onError: (error) => {
        console.error('유저 데이터를 불러오던 중 에러가 발생했습니다:', error);
        Sentry.captureException(error);
      },
      staleTime: 0, // 항상 백그라운드 fetch (SWR)
      cacheTime: 1000 * 60 * 10, // 10분
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    }
  );

  return { userData: data, isLoading, error: error || noUserIdError };
}
