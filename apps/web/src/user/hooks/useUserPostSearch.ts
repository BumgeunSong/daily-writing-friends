/**
 * Search the given user's own posts by title or content.
 *
 * The caller must pass an **already-trimmed** `query`. Whitespace-only input
 * would otherwise match every post via `% %`. `UserPostSearchView` applies
 * `.trim()` to the debounced value before passing it in.
 *
 * @see useUserSearch — searches FOR users by name/email (different feature).
 */
import * as Sentry from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import type { Post } from '@/post/model/Post';
import { searchOwnPosts } from '@/user/api/searchUserPosts';

const MIN_QUERY_LENGTH = 2;
const STALE_TIME_MS = 30_000;
const CACHE_TIME_MS = 5 * 60_000;

export function useUserPostSearch(userId: string, query: string) {
  return useQuery<Post[]>({
    queryKey: ['userPostSearch', userId, query],
    queryFn: () => searchOwnPosts(userId, query),
    enabled: query.length >= MIN_QUERY_LENGTH,
    staleTime: STALE_TIME_MS,
    cacheTime: CACHE_TIME_MS,
    keepPreviousData: true,
    onError: (error) => {
      Sentry.captureException(error);
    },
  });
}
