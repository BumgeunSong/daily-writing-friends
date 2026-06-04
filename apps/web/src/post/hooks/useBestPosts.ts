import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { fetchBestPosts, isWithinDays } from '@/post/api/post';
import type { Post } from '@/post/model/Post';
import { useAuth } from '@/shared/hooks/useAuth';
import { useBlockedByUsers } from '@/user/hooks/useBlockedByUsers';

export const BEST_POSTS_DAYS_RANGE = 7;
export const BEST_POSTS_MAX_PAGES = 5;
export const BEST_POSTS_PAGE_SIZE = 20;

/**
 * QueryKey for the best-posts infinite query. Co-located with the hook so
 * `invalidatePostCaches` (which uses ['bestPosts', boardId]) stays in lock-step.
 */
export function buildBestPostsQueryKey(boardId: string, blockedByUsers: string[] | undefined) {
  return ['bestPosts', boardId, blockedByUsers] as const;
}

export interface BestPostsPaginationConfig {
  pageSize: number;
  maxPages: number;
}

/**
 * Pure cursor mapper for the best-posts infinite query.
 * Returns the last post's engagementScore, or undefined if pagination should stop.
 *
 * Stops on three conditions:
 *   1) empty page (server has no more)
 *   2) partial page (server returned fewer than pageSize — no more available)
 *   3) maxPages reached (client-side hard cap to bound network usage)
 */
export function getBestPostsNextPageParam(
  lastPage: Post[],
  allPages: Post[][],
  config: BestPostsPaginationConfig = {
    pageSize: BEST_POSTS_PAGE_SIZE,
    maxPages: BEST_POSTS_MAX_PAGES,
  },
): number | undefined {
  if (lastPage.length === 0 || lastPage.length < config.pageSize) return undefined;
  if (allPages.length >= config.maxPages) return undefined;
  const lastPost = lastPage[lastPage.length - 1];
  return lastPost.engagementScore;
}

/**
 * Pure predicate that decides whether the best-posts hook should auto-fetch
 * another page. True only when current results are below the user-requested
 * target AND TanStack reports another page is available AND no fetch is in flight.
 */
export function shouldFetchMoreBestPosts(input: {
  currentCount: number;
  targetCount: number;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
}): boolean {
  return (
    input.currentCount < input.targetCount &&
    !!input.hasNextPage &&
    !input.isFetchingNextPage
  );
}

/**
 * 최근 7일 내 베스트 게시글을 불러오는 훅 (engagementScore 내림차순)
 * 서버: engagementScore 순 정렬
 * 클라이언트: 7일 필터링 + 결과 부족 시 자동 추가 페이지 요청
 */
export const useBestPosts = (boardId: string, targetCount: number) => {
  const { currentUser } = useAuth();
  const { data: blockedByUsers } = useBlockedByUsers(currentUser?.uid);

  const queryResult = useInfiniteQuery<Post[]>(
    buildBestPostsQueryKey(boardId, blockedByUsers),
    ({ pageParam = undefined }) =>
      fetchBestPosts(boardId, BEST_POSTS_PAGE_SIZE, blockedByUsers ?? [], pageParam),
    {
      enabled: !!boardId && !!currentUser?.uid && !!blockedByUsers,
      getNextPageParam: getBestPostsNextPageParam,
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
    if (shouldFetchMoreBestPosts({
      currentCount: recentPosts.length,
      targetCount,
      hasNextPage,
      isFetchingNextPage,
    })) {
      fetchNextPage();
    }
  }, [recentPosts.length, targetCount, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    ...queryResult,
    recentPosts: recentPosts.slice(0, targetCount),
    blockedByUsers: blockedByUsers ?? [],
  };
};
