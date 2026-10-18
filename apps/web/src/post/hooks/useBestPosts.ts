import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { fetchBestPosts } from '@/post/external/post.api';
import { isWithinDays } from '@/post/external/post.mapper';
import type { Post } from '@/post/model/Post';
import { useAuth } from '@/shared/hooks/useAuth';
import { useBlockedByUsers } from '@/user/hooks/useBlockedByUsers';

export const BEST_POSTS_DAYS_RANGE = 7;
export const BEST_POSTS_MAX_PAGES = 5;
export const BEST_POSTS_PAGE_SIZE = 20;

const BEST_POSTS_STALE_TIME_MS = 30 * 1000;
const BEST_POSTS_CACHE_TIME_MS = 5 * 60 * 1000;

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

export function getBestPostsNextPageParam(
  lastPage: Post[],
  allPages: Post[][],
  config: BestPostsPaginationConfig = {
    pageSize: BEST_POSTS_PAGE_SIZE,
    maxPages: BEST_POSTS_MAX_PAGES,
  },
): number | undefined {
  const serverHasNoMore = lastPage.length < config.pageSize;
  const hasReachedPageCap = allPages.length >= config.maxPages;
  if (serverHasNoMore || hasReachedPageCap) return undefined;

  const lastPost = lastPage[lastPage.length - 1];
  return lastPost.engagementScore;
}

export function shouldFetchMoreBestPosts(input: {
  currentCount: number;
  targetCount: number;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
}): boolean {
  const isBelowTarget = input.currentCount < input.targetCount;
  const hasMoreToFetch = !!input.hasNextPage;
  const isIdle = !input.isFetchingNextPage;
  return isBelowTarget && hasMoreToFetch && isIdle;
}

/**
 * Caps the total post count while preserving page boundaries: the author-data
 * prefetch keys one cache entry per page, so a flattened list would collapse
 * those keys back into one.
 */
export function limitPostGroups(groups: Post[][], limit: number): Post[][] {
  const limited: Post[][] = [];
  let remaining = limit;
  for (const group of groups) {
    if (remaining <= 0) break;
    limited.push(group.slice(0, remaining));
    remaining -= Math.min(group.length, remaining);
  }
  return limited;
}

/** 최근 7일 내 베스트 게시글 (engagementScore 내림차순) */
export const useBestPosts = (boardId: string, targetCount: number) => {
  const { currentUser } = useAuth();
  const { data: blockedByUsers } = useBlockedByUsers(currentUser?.uid);

  // Don't gate on !!blockedByUsers: fire best-posts immediately with the empty
  // default; the queryKey changes and TanStack refetches if a non-empty list
  // resolves later. Strips one Supabase RTT from the best-view's LCP path.
  const effectiveBlockedByUsers = blockedByUsers ?? [];
  const queryResult = useInfiniteQuery<Post[]>(
    buildBestPostsQueryKey(boardId, effectiveBlockedByUsers),
    ({ pageParam = undefined }) =>
      fetchBestPosts(boardId, BEST_POSTS_PAGE_SIZE, effectiveBlockedByUsers, pageParam),
    {
      enabled: !!boardId && !!currentUser?.uid,
      getNextPageParam: getBestPostsNextPageParam,
      meta: {
        errorContext: 'Loading best posts',
        feature: 'board-view-best',
        boardId,
      },
      staleTime: BEST_POSTS_STALE_TIME_MS,
      cacheTime: BEST_POSTS_CACHE_TIME_MS,
      refetchOnWindowFocus: true,
    }
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = queryResult;

  const recentPostPages = useMemo(() => {
    if (!data?.pages) return [];
    const pagesWithinDateRange = data.pages.map(page =>
      page.filter(post => isWithinDays(post, BEST_POSTS_DAYS_RANGE)),
    );
    return limitPostGroups(pagesWithinDateRange, targetCount);
  }, [data?.pages, targetCount]);

  const recentPosts = useMemo(() => recentPostPages.flat(), [recentPostPages]);

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
    recentPosts,
    recentPostPages,
    blockedByUsers: blockedByUsers ?? [],
  };
};
