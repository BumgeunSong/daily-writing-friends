import { http } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';

function neverResolves() {
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- an executor that never settles is the point
  return new Promise<never>(() => {});
}

/**
 * Holds every endpoint in `useBatchPostCardData`'s fanout open forever, so a
 * test asserting on already-rendered cards can never pass by accident just
 * because a refetch happened to resolve in time.
 *
 * Only the stats variant of `posts_feed` (filtered by `author_id`) is held; the
 * feed's own cursor requests fall through, so `postsFeedHandler` must still be
 * registered after these.
 */
export function pendingPostCardBatchHandlers() {
  return [
    http.get(`${SUPABASE_URL}/rest/v1/posts_feed`, ({ request }) => {
      const isStatsFanout = new URL(request.url).searchParams.has('author_id');
      if (!isStatsFanout) return undefined;
      return neverResolves();
    }),
    http.get(`${SUPABASE_URL}/rest/v1/users`, neverResolves),
    http.get(`${SUPABASE_URL}/rest/v1/comments`, neverResolves),
    http.get(`${SUPABASE_URL}/rest/v1/replies`, neverResolves),
    http.get(`${SUPABASE_URL}/rest/v1/donator_status`, neverResolves),
  ];
}
