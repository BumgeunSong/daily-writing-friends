import type { Commenting } from '@/user/model/Commenting';
import type { Replying } from '@/user/model/Replying';
import {
  fetchCommentingsByDateRangeFromSupabase,
  fetchReplyingsByDateRangeFromSupabase
} from '@/shared/api/supabaseReads';

// 날짜 범위로 commentings 조회
export async function fetchUserCommentingsByDateRange(
  userId: string,
  start: Date,
  end: Date
): Promise<Commenting[]> {
  return fetchCommentingsByDateRangeFromSupabase(userId, start, end);
}

// 날짜 범위로 replyings 조회
export async function fetchUserReplyingsByDateRange(
  userId: string,
  start: Date,
  end: Date
): Promise<Replying[]> {
  return fetchReplyingsByDateRangeFromSupabase(userId, start, end);
}
