import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { fetchBestPosts } from '@/post/api/post';
import { Post } from '@/post/model/Post';
import { useAuth } from '@/shared/hooks/useAuth';
import { getBlockedByUsers } from '@/user/api/user';

/**
 * 최근 7일 내 베스트 게시글을 불러오는 훅 (engagementScore 내림차순)
 */
export const useBestPosts = (boardId: string, limitCount: number) => {
  const { currentUser } = useAuth();
  const [blockedByUsers, setBlockedByUsers] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser?.uid) {
      getBlockedByUsers(currentUser.uid).then(setBlockedByUsers);
    }
  }, [currentUser?.uid]);

  const queryResult = useInfiniteQuery<Post[]>(
    ['bestPosts', boardId, blockedByUsers],
    ({ pageParam = undefined }) => fetchBestPosts(boardId, limitCount, blockedByUsers, pageParam),
    {
      enabled: !!boardId && !!currentUser?.uid,
      getNextPageParam: (lastPage) => {
        const lastPost = lastPage[lastPage.length - 1];
        return lastPost?.engagementScore;
      },
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
