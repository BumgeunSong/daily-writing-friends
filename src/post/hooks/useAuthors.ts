import { useQuery } from '@tanstack/react-query';
import { useCallback, useState, useEffect } from 'react';
import { User } from '@/user/model/User';
import { fetchAllUserDataWithBoardPermission } from '@/user/utils/userUtils';
import { getHourBasedSeed, shuffleArray } from '@shared/utils/shuffleUtils';

/**
 * 매 시간마다 작성자 목록을 섞어서 반환하는 커스텀 훅
 * @param boardId - 게시판 ID
 * @returns 섞인 작성자 목록과 상태
 */
export const useAuthors = (boardId: string) => {
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  // 다음 시간까지 남은 시간(ms) 계산
  const getTimeUntilNextHour = useCallback(() => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(now.getHours() + 1, 0, 0, 0);
    return nextHour.getTime() - now.getTime();
  }, []);

  // 작성자 데이터 페칭 및 섞기
  const { data: authors, isLoading, error } = useQuery<User[], Error>({
    queryKey: ['authors', boardId, currentHour],
    queryFn: async () => {
      const authorData = await fetchAllUserDataWithBoardPermission([boardId]);
      const seed = getHourBasedSeed();
      return shuffleArray(authorData, seed);
    },
    staleTime: getTimeUntilNextHour(), // 다음 시간까지 캐시 유지
    cacheTime: 3600000, // 1시간 동안 캐시 유지
  });

  // 매 시간마다 데이터 갱신을 위한 타이머 설정
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentHour(new Date().getHours());
    }, getTimeUntilNextHour());

    return () => clearTimeout(timer);
  }, [currentHour, getTimeUntilNextHour]);

  return {
    authors: authors ?? [],
    isLoading,
    error,
  };
}; 