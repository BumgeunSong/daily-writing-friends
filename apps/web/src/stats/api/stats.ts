import type { Posting } from '@/post/model/Posting';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';
import { createUserInfo } from '@/stats/utils/userInfoUtils';
import { fetchUserCommentingsByDateRange, fetchUserReplyingsByDateRange } from '@/user/api/commenting';
import { fetchUser } from '@/user/api/user';
import type { User } from '@/user/model/User';
import {
  fetchPostingsFromSupabase,
  fetchPostingsByDateRangeFromSupabase
} from '@/user/api/posting';

// Re-export for backward compatibility
export { createUserInfo };

/**
 * Fetches posting data for a specific user
 */
export async function fetchPostingData(userId: string): Promise<Posting[]> {
  return fetchPostingsFromSupabase(userId);
}

/**
 * Fetches commenting data (comments + replies) for a specific user within a date range
 */
export async function fetchCommentingData(userId: string, numberOfDays: number = 20) {
  const workingDays = getRecentWorkingDays(numberOfDays);
  const dateRange = getDateRange(workingDays);

  const [commentings, replyings] = await Promise.all([
    fetchUserCommentingsByDateRange(userId, dateRange.start, dateRange.end),
    fetchUserReplyingsByDateRange(userId, dateRange.start, dateRange.end),
  ]);

  return { commentings, replyings };
}

/**
 * Calculates date range from working days array
 */
export function getDateRange(workingDays: Date[]): { start: Date; end: Date } {
  const start = new Date(workingDays[0]);
  start.setHours(0, 0, 0, 0);
  const end = new Date(workingDays[workingDays.length - 1]);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Fetches posting data for contributions (limited to recent working days)
 */
export async function fetchPostingDataForContributions(
  userId: string,
  numberOfDays: number = 20
): Promise<Posting[]> {
  const workingDays = getRecentWorkingDays(numberOfDays);
  const dateRange = getDateRange(workingDays);

  return fetchPostingsByDateRangeFromSupabase(userId, dateRange.start, dateRange.end);
}

/**
 * Fetches user data with error handling
 */
export async function fetchUserSafely(userId: string): Promise<User | null> {
  try {
    return await fetchUser(userId);
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return null;
  }
}

// ================================================
// Batch Queries (shared by stats + board pages)
// ================================================

export interface UserIdRow {
  user_id: string;
  created_at: string;
}

/**
 * Shared helper: batch-fetch user_id rows from comments or replies table.
 * Uses indexes: idx_comments_user_created / idx_replies_user_created
 */
async function fetchBatchUserIdRowsByDateRange(
  table: 'comments' | 'replies',
  userIds: string[],
  start: Date,
  end: Date,
): Promise<UserIdRow[]> {
  if (userIds.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(table)
    .select('user_id, created_at')
    .in('user_id', userIds)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());
  if (error) {
    console.error(`Supabase batch ${table} fetch error:`, { userCount: userIds.length, start, end, error });
    throw error;
  }
  return (data || []) as UserIdRow[];
}

export const fetchBatchCommentUserIdsByDateRange = (
  userIds: string[], start: Date, end: Date,
) => fetchBatchUserIdRowsByDateRange('comments', userIds, start, end);

export const fetchBatchCommentCountsByDateRange = fetchBatchCommentUserIdsByDateRange;

export const fetchBatchReplyUserIdsByDateRange = (
  userIds: string[], start: Date, end: Date,
) => fetchBatchUserIdRowsByDateRange('replies', userIds, start, end);

export const fetchBatchReplyCountsByDateRange = fetchBatchReplyUserIdsByDateRange;

export interface PostDateRow {
  author_id: string;
  created_at: string;
}

export async function fetchBatchPostDatesByDateRange(
  userIds: string[],
  start: Date,
  end: Date
): Promise<PostDateRow[]> {
  if (userIds.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select('author_id, created_at')
    .in('author_id', userIds)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  if (error) {
    console.error('Supabase batch posts fetch error:', { userCount: userIds.length, start, end, error });
    throw error;
  }
  return (data || []) as PostDateRow[];
}

// ================================================
// Activity Counts
// ================================================

export interface ActivityCounts {
  commentings: number;
  replyings: number;
}

/**
 * Fetch activity counts: how many comments/replies fromUser made on toUser's posts/comments.
 * Replaces: Firestore fan-out subcollection queries in useActivity.ts
 */
export async function fetchActivityCountsFromSupabase(
  fromUserId: string,
  toUserId: string,
  daysAgo: number
): Promise<ActivityCounts> {
  const supabase = getSupabaseClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
  const cutoffIso = cutoffDate.toISOString();

  const [commentsOnPosts, repliesOnPosts, repliesOnComments] = await Promise.all([
    // Query 1: Comments fromUser made on toUser's posts
    supabase
      .from('comments')
      .select('id, posts!inner(author_id)', { count: 'exact', head: true })
      .eq('user_id', fromUserId)
      .eq('posts.author_id', toUserId)
      .gte('created_at', cutoffIso),

    // Query 2: Replies fromUser made on toUser's posts
    supabase
      .from('replies')
      .select('id, posts!inner(author_id)', { count: 'exact', head: true })
      .eq('user_id', fromUserId)
      .eq('posts.author_id', toUserId)
      .gte('created_at', cutoffIso),

    // Query 3: Replies fromUser made on toUser's comments
    supabase
      .from('replies')
      .select('id, comments!inner(user_id)', { count: 'exact', head: true })
      .eq('user_id', fromUserId)
      .eq('comments.user_id', toUserId)
      .gte('created_at', cutoffIso),
  ]);

  if (commentsOnPosts.error) console.error('Activity comments query error:', { fromUserId, toUserId }, commentsOnPosts.error);
  if (repliesOnPosts.error) console.error('Activity repliesOnPosts query error:', { fromUserId, toUserId }, repliesOnPosts.error);
  if (repliesOnComments.error) console.error('Activity repliesOnComments query error:', { fromUserId, toUserId }, repliesOnComments.error);

  return {
    commentings: commentsOnPosts.count ?? 0,
    replyings: (repliesOnPosts.count ?? 0) + (repliesOnComments.count ?? 0),
  };
}
