import { http, HttpResponse } from 'msw';
import type { CommentRowWire } from '@/test/fixtures/comment';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const COMMENTS_URL = `${SUPABASE_URL}/rest/v1/comments`;

/**
 * MSW handler for `GET /rest/v1/comments` (the `useComments` suspense read).
 * Honors the narrow slice `fetchCommentsFromSupabase` depends on: `post_id=eq.<id>`
 * and `order=created_at.asc`. Any other filter shape is a config/drift bug — fail
 * loud rather than silently returning the full list (mirrors postsFeedHandler).
 */
export function commentsHandler({ comments }: { comments: CommentRowWire[] }) {
  return http.get(COMMENTS_URL, ({ request }) => {
    const url = new URL(request.url);

    const postIdFilter = url.searchParams.get('post_id');
    if (postIdFilter !== null && !postIdFilter.startsWith('eq.')) {
      return HttpResponse.json(
        { message: `commentsHandler: unsupported post_id filter "${postIdFilter}"` },
        { status: 500 },
      );
    }
    const wantedPost = postIdFilter?.slice('eq.'.length);
    const rows = wantedPost ? comments.filter((c) => c.post_id === wantedPost) : comments;

    const ordered = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return HttpResponse.json(ordered);
  });
}
