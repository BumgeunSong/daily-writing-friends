import { getSupabaseClient } from '@/shared/external/supabaseClient';

import { type SupabaseReplying, mapToReplying } from './activity.mapper';

export type { SupabaseReplying };

const REPLYING_SELECT =
  'id, created_at, comment_id, post_id, user_id, comments!inner ( id ), posts!inner ( id, title, author_id, board_id )';

/**
 * Fetch user's replies within a date range.
 * Uses index: idx_replies_user_created. Uses denormalized post_id on replies.
 */
export async function fetchReplyingsByDateRangeFromSupabase(
  userId: string,
  start: Date,
  end: Date,
): Promise<SupabaseReplying[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('replies')
    .select(REPLYING_SELECT)
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapToReplying);
}
