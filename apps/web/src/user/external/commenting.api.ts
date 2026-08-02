import { getSupabaseClient } from '@/shared/external/supabaseClient';
import type { Commenting } from '@/user/model/Commenting';
import type { Replying } from '@/user/model/Replying';

import { fetchReplyingsByDateRangeFromSupabase } from './replying.api';
import { type SupabaseCommenting, mapToCommenting } from './activity.mapper';

export type { SupabaseCommenting };

const COMMENTING_SELECT = 'id, content, created_at, post_id, posts!inner ( id, title, author_id, board_id )';

/**
 * Fetch user's comments within a date range.
 * Uses index: idx_comments_user_created. Joins posts for title/author_id.
 */
export async function fetchCommentingsByDateRangeFromSupabase(
  userId: string,
  start: Date,
  end: Date,
): Promise<SupabaseCommenting[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('comments')
    .select(COMMENTING_SELECT)
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapToCommenting);
}

// 날짜 범위로 commentings 조회
export async function fetchUserCommentingsByDateRange(
  userId: string,
  start: Date,
  end: Date,
): Promise<Commenting[]> {
  return fetchCommentingsByDateRangeFromSupabase(userId, start, end);
}

// 날짜 범위로 replyings 조회
export async function fetchUserReplyingsByDateRange(
  userId: string,
  start: Date,
  end: Date,
): Promise<Replying[]> {
  return fetchReplyingsByDateRangeFromSupabase(userId, start, end);
}
