import { http, HttpResponse } from 'msw';
import type { PostRow } from '@/test/fixtures/post';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const POSTS_FEED_URL = `${SUPABASE_URL}/rest/v1/posts_feed`;

export interface PostsFeedHandlerOptions {
  /** Posts to serve, sorted newest-first. The handler slices by `limit` and the `created_at=lt.<iso>` cursor. */
  posts: PostRow[];
  /** Called on every request — assert on call count or URL search params. */
  onRequest?: (url: URL) => void;
}

/**
 * MSW handler for the `posts_feed` view that the recent-posts infinite query reads.
 * Replicates PostgREST cursor semantics: `created_at=lt.<iso>` filter + `limit=<n>`.
 */
export function postsFeedHandler({ posts, onRequest }: PostsFeedHandlerOptions) {
  return http.get(POSTS_FEED_URL, ({ request }) => {
    const url = new URL(request.url);
    onRequest?.(url);

    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : 7;

    const createdAtFilter = url.searchParams.get('created_at');
    const cursorIso = createdAtFilter?.startsWith('lt.')
      ? createdAtFilter.slice('lt.'.length)
      : undefined;

    const filtered = cursorIso
      ? posts.filter((p) => p.created_at < cursorIso)
      : posts;

    return HttpResponse.json(filtered.slice(0, limit));
  });
}

/** Convenience: always returns 500. Used to drive the error precedence branch. */
export function postsFeedErrorHandler() {
  return http.get(POSTS_FEED_URL, () =>
    HttpResponse.json({ message: 'boom' }, { status: 500 }),
  );
}
