import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { fetchBestPosts } from '@/post/api/post';
import { Post } from '@/post/model/Post';
import { useAuth } from '@/shared/hooks/useAuth';
import { getBlockedByUsers } from '@/user/api/user';

/**
 * 최근 7일 내 베스트 게시글을 불러오는 훅 (engagementScore 내림차순)
 * 클라이언트 사이드 정렬로 페이지네이션 없이 상위 N개만 반환
 */
export const useBestPosts = (boardId: string, limitCount: number) => {
  const { currentUser } = useAuth();
  const [blockedByUsers, setBlockedByUsers] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser?.uid) {
      getBlockedByUsers(currentUser.uid).then(setBlockedByUsers);
    }
  }, [currentUser?.uid]);

  const queryResult = useQuery<Post[]>(
    ['bestPosts', boardId, blockedByUsers],
    () => fetchBestPosts(boardId, limitCount, blockedByUsers),
    {
      enabled: !!boardId && !!currentUser?.uid,
      meta: {
        errorContext: 'Loading best posts',
        feature: 'board-view-best',
        boardId,
      },
      staleTime: 1000 * 30,
      cacheTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
    }
  );

  return {
    ...queryResult,
    blockedByUsers,
  };
};
