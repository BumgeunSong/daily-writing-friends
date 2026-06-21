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

const DEFAULT_LIMIT = 7;

/**
 * MSW handler for the `posts_feed` view that the recent-posts infinite query reads.
 * Implements the narrow slice of PostgREST cursor semantics that `useRecentPosts`
 * depends on: `created_at=lt.<iso>` + `limit=<n>`. Any other filter shape is a
 * test-config bug (or a production drift this handler hasn't been extended for) —
 * fail loud rather than silently returning the full list.
 */
export function postsFeedHandler({ posts, onRequest }: PostsFeedHandlerOptions) {
  return http.get(POSTS_FEED_URL, ({ request }) => {
    const url = new URL(request.url);
    onRequest?.(url);

    const limitParam = url.searchParams.get('limit');
    const limit = limitParam === null ? DEFAULT_LIMIT : Number(limitParam);
    if (!Number.isFinite(limit) || limit < 0) {
      return HttpResponse.json(
        { message: `postsFeedHandler: malformed limit "${limitParam}"` },
        { status: 500 },
      );
    }

    const createdAtFilter = url.searchParams.get('created_at');
    if (createdAtFilter !== null && !createdAtFilter.startsWith('lt.')) {
      return HttpResponse.json(
        { message: `postsFeedHandler: unsupported created_at filter "${createdAtFilter}" — extend the handler if a new operator is needed` },
        { status: 500 },
      );
    }
    const cursorIso = createdAtFilter?.slice('lt.'.length);

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
