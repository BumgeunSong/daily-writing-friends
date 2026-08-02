import { getSupabaseClient } from '@/shared/external/supabaseClient';

import { type SupabasePosting, mapToPosting } from './activity.mapper';

export type { SupabasePosting };

const POSTING_SELECT = 'id, board_id, title, content_length, created_at';

/**
 * Fetch user's posts from the posts_feed view.
 * Uses index: idx_posts_author_created
 */
export async function fetchPostingsFromSupabase(userId: string): Promise<SupabasePosting[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('posts_feed')
    .select(POSTING_SELECT)
    .eq('author_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapToPosting);
}

/** Fetch user's posts within a date range from the posts_feed view. */
export async function fetchPostingsByDateRangeFromSupabase(
  userId: string,
  start: Date,
  end: Date,
): Promise<SupabasePosting[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('posts_feed')
    .select(POSTING_SELECT)
    .eq('author_id', userId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapToPosting);
}
