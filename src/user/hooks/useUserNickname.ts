import { getCachedUserData } from "../cache/userCache";
import { fetchUserFromFirestore } from "../api/user";
import { cacheUserData } from "../cache/userCache";
import { useQuery } from "@tanstack/react-query";
import * as Sentry from '@sentry/react';

// uid로 닉네임만 가져오는 React Query 훅 (에러 처리, Sentry 연동, 일관된 반환)
export function useUserNickname(uid: string | null) {
    const noUserIdError = uid === null ? new Error('유저 ID가 존재하지 않아 닉네임을 불러올 수 없습니다.') : null;
  
    const { data, isLoading, error } = useQuery<string | null>(
      ['userNickname', uid],
      async () => {
        if (uid === null) throw noUserIdError;
        const cached = getCachedUserData(uid);
        if (cached?.nickname) return cached.nickname;
        const user = await fetchUserFromFirestore(uid);
        if (user) cacheUserData(uid, user);
        return user?.nickname || null;
      },
      {
        enabled: uid !== null,
        onError: (error) => {
          console.error('닉네임을 불러오던 중 에러가 발생했습니다:', error);
          Sentry.captureException(error);
        },
        staleTime: 1000 * 60 * 5,
        cacheTime: 1000 * 60 * 10,
      }
    );
  
    return { nickname: data, isLoading, error: error || noUserIdError };
  } 