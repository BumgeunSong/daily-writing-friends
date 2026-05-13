/**
 * Search the signed-in user's own posts by keyword.
 *
 * Scope: only posts whose `author_id` equals the passed `userId`. Enforced by
 *   (1) `.eq('author_id', userId)` in this query,
 *   (2) Postgres RLS on `posts`, and
 *   (3) the caller-side `isMyPage` gate in `UserPageHeader`.
 *
 * Field choice: WHERE matches against `title` and the full `content` column
 * so keywords past the first ~500 chars of body still hit; SELECT only
 * returns `content_preview` (existing 500-char generated column) so the
 * response payload stays the same size as the regular feed query.
 *
 * Cap: at most 50 most-recent matches. No pagination in v1.
 */
import * as Sentry from '@sentry/react';
import type { Post } from '@/post/model/Post';
import { FEED_POST_SELECT, mapRowToPost } from '@/post/api/post';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { escapeForOrFilter } from '@/shared/api/postgrestFilters';

const DEFAULT_LIMIT = 50;

/**
 * Returns up to `limit + 1` rows so the caller can distinguish "exactly `limit`
 * matches exist" from "more matches exist, truncated at the cap" — important
 * for the cap notice in the UI. View is expected to slice to `limit`.
 */
export async function searchOwnPosts(
  userId: string,
  query: string,
  limit: number = DEFAULT_LIMIT,
): Promise<Post[]> {
  const supabase = getSupabaseClient();

  const escaped = escapeForOrFilter(query);
  const pattern = `%${escaped}%`;
  const orFilter = `title.ilike.${pattern},content.ilike.${pattern}`;

  const { data, error } = await supabase
    .from('posts')
    .select(`${FEED_POST_SELECT}, boards(first_day)`)
    .eq('author_id', userId)
    .or(orFilter)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (error) {
    // Avoid console.error here: the Supabase PostgrestError's `details` field
    // can echo the filter string (containing the user's raw query) and would
    // leak to any console-scraping log collector. The hook's Sentry.captureException
    // (no `extra`) is the sanctioned telemetry path.
    Sentry.captureException(error, { tags: { feature: 'user-post-search' } });
    throw error;
  }

  return (data || []).map(mapRowToPost);
}
