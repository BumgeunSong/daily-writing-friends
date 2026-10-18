import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const REPLIES_URL = `${SUPABASE_URL}/rest/v1/replies`;

/**
 * MSW handler for `GET /rest/v1/replies`. First fixtures carry no replies, but
 * `useReplies` is a suspense read, so the endpoint MUST resolve (empty) rather
 * than 404-hang. The `useReplyCount` HEAD request is absorbed by the supabase
 * fallthrough (it returns no rows → count 0).
 */
export function repliesHandler() {
  return http.get(REPLIES_URL, () => HttpResponse.json([]));
}
