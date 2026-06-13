/**
 * Shared cache-key builders for post and user queries.
 *
 * All writers (seed, prefetch, loader ensureQueryData, mutations) and readers
 * (useQuery, useUser) MUST use these to prevent silent cache-key drift that
 * would defeat the warm-cache navigation optimization.
 */
export const postQueryKey = (boardId: string, postId: string) =>
  ['post', boardId, postId] as const;

export const userQueryKey = (uid: string) => ['user', uid] as const;
