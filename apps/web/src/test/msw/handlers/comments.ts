import { http, HttpResponse } from 'msw';
import type { CommentRowWire } from '@/test/fixtures/comment';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const COMMENTS_URL = `${SUPABASE_URL}/rest/v1/comments`;

/**
 * MSW handler for the `useComments` list read: `post_id=eq.<id>` + `order=created_at.asc`.
 * The `/rest/v1/comments` path is also hit by stats reads (`user_id=eq.`, no
 * `post_id`, a `posts!inner` embed) — those carry no `post_id`, so we answer them
 * with an empty list rather than the wrongly-shaped comment rows. A present-but-non-`eq.`
 * `post_id` is a real drift — fail loud (mirrors postsFeedHandler).
 */
export function commentsHandler({ comments }: { comments: CommentRowWire[] }) {
  return http.get(COMMENTS_URL, ({ request }) => {
    const postIdFilter = new URL(request.url).searchParams.get('post_id');
    if (postIdFilter === null) return HttpResponse.json([]);
    if (!postIdFilter.startsWith('eq.')) {
      return HttpResponse.json(
        { message: `commentsHandler: unsupported post_id filter "${postIdFilter}"` },
        { status: 500 },
      );
    }
    const wantedPost = postIdFilter.slice('eq.'.length);
    const rows = comments.filter((c) => c.post_id === wantedPost);
    const ordered = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return HttpResponse.json(ordered);
  });
}
