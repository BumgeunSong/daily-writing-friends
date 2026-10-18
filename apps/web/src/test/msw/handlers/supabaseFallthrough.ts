import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';

/**
 * Deterministic empty response for any supabase REST read the specific handlers
 * don't cover (reply-count HEAD, users, stats). Keeps the gate render from
 * hanging on a real-network miss. MUST be registered LAST — MSW matches in
 * order, first match wins, so specific handlers take precedence.
 */
export function supabaseFallthrough() {
  return http.all(`${SUPABASE_URL}/rest/v1/*`, () => HttpResponse.json([]));
}
