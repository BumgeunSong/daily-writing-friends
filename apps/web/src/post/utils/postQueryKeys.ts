/**
 * Shared cache-key builder for post queries.
 *
 * All writers (seed, prefetch, loader ensureQueryData, mutations) and readers
 * (useQuery in PostDetailPage/PostEditPage) MUST use this to prevent silent
 * cache-key drift that would defeat the warm-cache navigation optimization.
 */
export const postQueryKey = (boardId: string, postId: string) =>
  ['post', boardId, postId] as const;
