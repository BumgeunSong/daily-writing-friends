import { http } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';

function neverResolves() {
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- an executor that never settles is the point
  return new Promise<never>(() => {});
}

/**
 * Holds every endpoint in `useBatchPostCardData`'s fanout open forever.
 *
 * A pending batch is the state that exposes list churn: any card whose author
 * data is not already cached stays in its loading shape for the whole test, so
 * an assertion about already-rendered cards can never pass by accident just
 * because a refetch happened to resolve in time.
 *
 * The `posts_feed` resolver only holds the stats variant (filtered by
 * `author_id`); the feed's own cursor requests fall through to the next
 * handler, so `postsFeedHandler` must still be registered after these.
 */
export function pendingPostCardBatchHandlers() {
  return [
    http.get(`${SUPABASE_URL}/rest/v1/posts_feed`, ({ request }) => {
      const url = new URL(request.url);
      if (!url.searchParams.has('author_id')) return undefined;
      return neverResolves();
    }),
    http.get(`${SUPABASE_URL}/rest/v1/users`, neverResolves),
    http.get(`${SUPABASE_URL}/rest/v1/comments`, neverResolves),
    http.get(`${SUPABASE_URL}/rest/v1/replies`, neverResolves),
    http.get(`${SUPABASE_URL}/rest/v1/donator_status`, neverResolves),
  ];
}
