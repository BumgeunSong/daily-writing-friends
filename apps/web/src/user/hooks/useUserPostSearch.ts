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

const MIN_QUERY_LENGTH = 2;
const STALE_TIME_MS = 30_000;
const CACHE_TIME_MS = 5 * 60_000;

/**
 * Opaque FNV-1a 32-bit hash of the search query. Used in place of the raw
 * query inside the React Query key so the global Sentry error tracker
 * (which records `queryKey` into Sentry context for every failed query)
 * never sees the user's keyword. Cache scoping still works because identical
 * queries hash identically.
 */
function hashQuery(query: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < query.length; i++) {
    hash ^= query.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function useUserPostSearch(userId: string, query: string) {
  return useQuery<Post[]>({
    queryKey: ['userPostSearch', userId, hashQuery(query)],
    queryFn: () => searchOwnPosts(userId, query),
    enabled: query.length >= MIN_QUERY_LENGTH,
    staleTime: STALE_TIME_MS,
    cacheTime: CACHE_TIME_MS,
    keepPreviousData: true,
    // Sentry reporting is delegated to the global QueryCache.onError tracker
    // (src/shared/lib/queryClient.ts → trackQueryError). It wraps the error
    // via `getErrorMessage` so PostgrestError.details (which may echo the
    // filter string) is not propagated, and the queryKey above is hashed.
  });
}
