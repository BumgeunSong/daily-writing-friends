import { Timestamp } from 'firebase/firestore';
import { Commenting } from '@/user/model/Commenting';
import { Replying } from '@/user/model/Replying';
import {
  fetchCommentingsByDateRangeFromSupabase,
  fetchReplyingsByDateRangeFromSupabase,
  SupabaseCommenting,
  SupabaseReplying,
} from '@/shared/api/supabaseReads';

// Helper: Convert Supabase result to Commenting format (for type compatibility)
function toCommenting(item: SupabaseCommenting): Commenting {
  return {
    board: item.board,
    post: item.post,
    comment: item.comment,
    createdAt: Timestamp.fromDate(item.createdAt),
  };
}

// Helper: Convert Supabase result to Replying format
function toReplying(item: SupabaseReplying): Replying {
  return {
    board: item.board,
    post: item.post,
    comment: item.comment,
    reply: item.reply,
    createdAt: Timestamp.fromDate(item.createdAt),
  };
}

// 날짜 범위로 commentings 조회
export async function fetchUserCommentingsByDateRange(
  userId: string,
  start: Date,
  end: Date
): Promise<Commenting[]> {
  const supabaseData = await fetchCommentingsByDateRangeFromSupabase(userId, start, end);
  return supabaseData.map(toCommenting);
}

// 날짜 범위로 replyings 조회
export async function fetchUserReplyingsByDateRange(
  userId: string,
  start: Date,
  end: Date
): Promise<Replying[]> {
  const supabaseData = await fetchReplyingsByDateRangeFromSupabase(userId, start, end);
  return supabaseData.map(toReplying);
}
