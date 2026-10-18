import { http, HttpResponse } from 'msw';
import type { ReactionRowWire } from '@/test/fixtures/comment';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const REACTIONS_URL = `${SUPABASE_URL}/rest/v1/reactions`;

// PostgREST renders `.in('comment_id', ids)` as `comment_id=in.(a,b,c)` (values
// quoted only when needed). Parse both the batch `in.(…)` and single `eq.` forms.
function matchedCommentIds(filter: string | null): { kind: 'in'; ids: string[] } | { kind: 'eq'; id: string } | null {
  if (filter === null) return null;
  if (filter.startsWith('in.(') && filter.endsWith(')')) {
    const ids = filter
      .slice('in.('.length, -1)
      .split(',')
      .map((v) => v.replace(/^"|"$/g, ''))
      .filter(Boolean);
    return { kind: 'in', ids };
  }
  if (filter.startsWith('eq.')) return { kind: 'eq', id: filter.slice('eq.'.length) };
  return null;
}

/**
 * MSW handler for `GET /rest/v1/reactions` — the batch prefetch
 * (`comment_id=in.(…)`) that `usePrefetchCommentReactions` fires. Also answers a
 * per-comment `comment_id=eq.` read as a safety net. Rows carry `comment_id` so
 * the batch grouper can bucket them.
 */
export function reactionsHandler({ rows }: { rows: ReactionRowWire[] }) {
  return http.get(REACTIONS_URL, ({ request }) => {
    const match = matchedCommentIds(new URL(request.url).searchParams.get('comment_id'));
    if (match === null) return HttpResponse.json(rows);
    if (match.kind === 'in') return HttpResponse.json(rows.filter((r) => match.ids.includes(r.comment_id)));
    return HttpResponse.json(rows.filter((r) => r.comment_id === match.id));
  });
}
