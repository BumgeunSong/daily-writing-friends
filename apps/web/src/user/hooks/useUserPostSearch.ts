/**
 * Search the given user's own posts by title or content.
 *
 * The caller must pass an **already-trimmed** `query`. Whitespace-only input
 * would otherwise match every post via `% %`. `UserPostSearchView` applies
 * `.trim()` to the debounced value before passing it in.
 *
 * @see useUserSearch — searches FOR users by name/email (different feature).
 */
import { useQuery } from '@tanstack/react-query';
import type { Post } from '@/post/model/Post';
import { searchOwnPosts } from '@/user/api/searchUserPosts';
import { MIN_QUERY_LENGTH } from '@/user/search/constants';
const STALE_TIME_MS = 30_000;
const CACHE_TIME_MS = 5 * 60_000;

export const USER_POST_SEARCH_QUERY_KEY = 'userPostSearch';

export function useUserPostSearch(userId: string, query: string) {
  return useQuery<Post[]>({
    // The raw query is kept in the key so React Query's cache scopes correctly
    // (a non-collision-free hash would risk returning posts for the wrong
    // keyword). PII redaction for this key happens centrally in
    // `src/shared/lib/queryErrorTracking.ts → redactQueryKey`, which strips
    // the third element before any Sentry context/breadcrumb is recorded.
    queryKey: [USER_POST_SEARCH_QUERY_KEY, userId, query],
    queryFn: () => searchOwnPosts(userId, query),
    enabled: query.length >= MIN_QUERY_LENGTH,
    staleTime: STALE_TIME_MS,
    cacheTime: CACHE_TIME_MS,
    keepPreviousData: true,
    // Sentry reporting is delegated to the global QueryCache.onError tracker
    // (src/shared/lib/queryClient.ts → trackQueryError). It wraps the error
    // via `getErrorMessage` so PostgrestError.details (which may echo the
    // filter string) is not propagated.
  });
}
