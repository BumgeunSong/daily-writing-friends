/* eslint-disable local/no-new-shared-supabase-fetch -- file scheduled for removal; existing exports are being moved out per docs/plans/2026-05-10-supabasereads-feature-split.md */
/**
 * Supabase Read Functions
 *
 * Direct table queries replacing Firestore fan-out subcollections AND core entity reads.
 * Uses indexes: idx_posts_author_created, idx_comments_user_created, idx_replies_user_created,
 *   idx_posts_board_created, idx_posts_board_engagement, idx_comments_post_created,
 *   idx_replies_comment_created, idx_permissions_user
 */

import { getSupabaseClient } from './supabaseClient';

/** Format string array as PostgREST `in.(...)` value with proper quoting */
export function formatInFilter(values: string[]): string {
  const quoted = values.map((v) => `"${v.replace(/"/g, '""')}"`);
  return `(${quoted.join(',')})`;
}

// Note: Supabase join selects return arrays at the type level,
// but !inner guarantees exactly one row. We use type assertions in the mappers.

// ================================================
// Core Entity Read Functions (Phase A migration)
// ================================================

// --- Batch Queries (shared by stats + board pages) ---

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

// --- Activity Counts ---

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
