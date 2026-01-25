/**
 * Supabase Read Functions
 *
 * Direct table queries replacing Firestore fan-out subcollections.
 * Uses indexes: idx_posts_author_created, idx_comments_user_created, idx_replies_user_created
 */

import { getSupabaseClient } from './supabaseClient';

// Supabase row types for query results
interface PostRow {
  id: string;
  board_id: string;
  title: string;
  content: string | null;
  created_at: string;
}

interface CommentRow {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  posts: {
    id: string;
    title: string;
    author_id: string;
    board_id: string;
  };
}

interface ReplyRow {
  id: string;
  created_at: string;
  comment_id: string;
  post_id: string;
  comments: {
    id: string;
    user_id: string;
  };
  posts: {
    id: string;
    title: string;
    author_id: string;
    board_id: string;
  };
}

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
    .select('id, board_id, title, content, created_at')
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
      contentLength: (row.content || '').length,
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
    .select('id, board_id, title, content, created_at')
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
      contentLength: (row.content || '').length,
    },
    createdAt: new Date(row.created_at),
  }));
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

  return (data || []).map((row: CommentRow) => ({
    board: { id: row.posts.board_id },
    post: { id: row.posts.id, title: row.posts.title, authorId: row.posts.author_id },
    comment: { id: row.id, content: row.content },
    createdAt: new Date(row.created_at),
  }));
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
      comments!comment_id (
        id,
        user_id
      ),
      posts!post_id (
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

  return (data || []).map((row: ReplyRow) => ({
    board: { id: row.posts.board_id },
    post: { id: row.posts.id, title: row.posts.title, authorId: row.posts.author_id },
    comment: { id: row.comments.id, authorId: row.comments.user_id },
    reply: { id: row.id },
    createdAt: new Date(row.created_at),
  }));
}
