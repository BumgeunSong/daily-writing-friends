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

// Supabase row types for query results
interface PostRow {
  id: string;
  board_id: string;
  title: string;
  content_length: number;
  created_at: string;
}

// Note: Supabase join selects return arrays at the type level,
// but !inner guarantees exactly one row. We use type assertions in the mappers.

// Types matching the Firestore fan-out models for compatibility
export interface SupabasePosting {
  board: { id: string };
  post: { id: string; title: string; contentLength: number };
  createdAt: Date;
  isRecovered?: boolean;
}

export interface SupabaseCommenting {
  board: { id: string };
  post: { id: string; title: string; authorId: string };
  comment: { id: string; content: string };
  createdAt: Date;
}

export interface SupabaseReplying {
  board: { id: string };
  post: { id: string; title: string; authorId: string };
  comment: { id: string; authorId: string };
  reply: { id: string };
  createdAt: Date;
}

/**
 * Fetch user's posts from Supabase posts table.
 * Replaces: users/{userId}/postings subcollection
 * Uses index: idx_posts_author_created
 */
export async function fetchPostingsFromSupabase(userId: string): Promise<SupabasePosting[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('posts')
    .select('id, board_id, title, content_length, created_at')
    .eq('author_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetchPostings error:', error);
    throw error;
  }

  return (data || []).map((row: PostRow) => ({
    board: { id: row.board_id },
    post: {
      id: row.id,
      title: row.title,
      contentLength: row.content_length ?? 0,
    },
    createdAt: new Date(row.created_at),
  }));
}

/**
 * Fetch user's posts within a date range from Supabase.
 * Replaces: users/{userId}/postings with date filter
 */
export async function fetchPostingsByDateRangeFromSupabase(
  userId: string,
  start: Date,
  end: Date
): Promise<SupabasePosting[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('posts')
    .select('id, board_id, title, content_length, created_at')
    .eq('author_id', userId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetchPostingsByDateRange error:', error);
    throw error;
  }

  return (data || []).map((row: PostRow) => ({
    board: { id: row.board_id },
    post: {
      id: row.id,
      title: row.title,
      contentLength: row.content_length ?? 0,
    },
    createdAt: new Date(row.created_at),
  }));
}

/** Shared join fields for posts table */
interface PostJoinFields {
  id: string;
  title: string;
  author_id: string;
  board_id: string;
}

/** Row from: comments + posts!inner join */
interface CommentWithPostJoin {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  posts: PostJoinFields | PostJoinFields[];
}

/** Row from: replies + comments!inner + posts!inner join */
interface ReplyWithJoins {
  id: string;
  created_at: string;
  comment_id: string;
  post_id: string;
  user_id: string;
  comments: { id: string } | { id: string }[];
  posts: PostJoinFields | PostJoinFields[];
}

/**
 * Fetch user's comments within a date range from Supabase.
 * Replaces: users/{userId}/commentings subcollection
 * Uses index: idx_comments_user_created
 *
 * Note: Requires JOIN with posts table to get post title and author_id
 */
export async function fetchCommentingsByDateRangeFromSupabase(
  userId: string,
  start: Date,
  end: Date
): Promise<SupabaseCommenting[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      created_at,
      post_id,
      posts!inner (
        id,
        title,
        author_id,
        board_id
      )
    `)
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetchCommentings error:', error);
    throw error;
  }

  return ((data || []) as CommentWithPostJoin[]).map((row) => {
    const post = Array.isArray(row.posts) ? row.posts[0] : row.posts;
    return {
      board: { id: post.board_id },
      post: { id: post.id, title: post.title, authorId: post.author_id },
      comment: { id: row.id, content: row.content },
      createdAt: new Date(row.created_at),
    };
  });
}

/**
 * Fetch user's replies within a date range from Supabase.
 * Replaces: users/{userId}/replyings subcollection
 * Uses index: idx_replies_user_created
 *
 * Note: Uses denormalized post_id on replies table for efficiency
 */
export async function fetchReplyingsByDateRangeFromSupabase(
  userId: string,
  start: Date,
  end: Date
): Promise<SupabaseReplying[]> {
  const supabase = getSupabaseClient();

  // Use compound filter to avoid duplicate created_at params issue
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const { data, error } = await supabase
    .from('replies')
    .select(`
      id,
      created_at,
      comment_id,
      post_id,
      user_id,
      comments!inner (
        id
      ),
      posts!inner (
        id,
        title,
        author_id,
        board_id
      )
    `)
    .eq('user_id', userId)
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase fetchReplyings error:', error);
    throw error;
  }

  return ((data || []) as ReplyWithJoins[]).map((row) => {
    const post = Array.isArray(row.posts) ? row.posts[0] : row.posts;
    const comment = Array.isArray(row.comments) ? row.comments[0] : row.comments;
    return {
      board: { id: post.board_id },
      post: { id: post.id, title: post.title, authorId: post.author_id },
      comment: { id: comment.id, authorId: '' }, // comment author not available (column ambiguity)
      reply: { id: row.id },
      createdAt: new Date(row.created_at),
    };
  });
}

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
