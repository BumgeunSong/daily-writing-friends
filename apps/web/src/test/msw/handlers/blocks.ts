import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const BLOCKS_URL = `${SUPABASE_URL}/rest/v1/blocks`;

/**
 * MSW handler for the `blocks` table used by `useBlockedByUsers`.
 * Default behavior: return an empty list (no one has blocked the user).
 */
export function blocksHandler({ blockerIds = [] }: { blockerIds?: string[] } = {}) {
  return http.get(BLOCKS_URL, () =>
    HttpResponse.json(blockerIds.map((blocker_id) => ({ blocker_id }))),
  );
}
