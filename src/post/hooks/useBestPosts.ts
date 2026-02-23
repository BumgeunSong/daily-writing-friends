import { useInfiniteQuery } from '@tanstack/react-query';
import { useState, useEffect, useMemo } from 'react';
import { fetchBestPosts, isWithinDays } from '@/post/api/post';
import type { Post } from '@/post/model/Post';
import { useAuth } from '@/shared/hooks/useAuth';
import { getBlockedByUsers } from '@/user/api/user';

const BEST_POSTS_DAYS_RANGE = 7;
const MAX_PAGES_TO_FETCH = 5;
const PAGE_SIZE = 20;

/**
 * 최근 7일 내 베스트 게시글을 불러오는 훅 (engagementScore 내림차순)
 * 서버: engagementScore 순 정렬
 * 클라이언트: 7일 필터링 + 결과 부족 시 자동 추가 페이지 요청
 */
export const useBestPosts = (boardId: string, targetCount: number) => {
  const { currentUser } = useAuth();
  const [blockedByUsers, setBlockedByUsers] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser?.uid) {
      getBlockedByUsers(currentUser.uid).then(setBlockedByUsers);
    }
  }, [currentUser?.uid]);

  const queryResult = useInfiniteQuery<Post[]>(
    ['bestPosts', boardId, blockedByUsers],
    ({ pageParam = undefined }) => fetchBestPosts(boardId, PAGE_SIZE, blockedByUsers, pageParam),
    {
      enabled: !!boardId && !!currentUser?.uid,
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.length === 0 || lastPage.length < PAGE_SIZE) return undefined;
        if (allPages.length >= MAX_PAGES_TO_FETCH) return undefined;
        const lastPost = lastPage[lastPage.length - 1];
        return lastPost.engagementScore;
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

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = queryResult;

  const recentPosts = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages
      .flat()
      .filter(post => isWithinDays(post, BEST_POSTS_DAYS_RANGE));
  }, [data?.pages]);

  useEffect(() => {
    if (
      recentPosts.length < targetCount &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [recentPosts.length, targetCount, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    ...queryResult,
    recentPosts: recentPosts.slice(0, targetCount),
    blockedByUsers,
  };
};
