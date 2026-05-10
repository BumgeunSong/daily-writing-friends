import { getSupabaseClient } from '@/shared/api/supabaseClient';
import type { Commenting } from '@/user/model/Commenting';
import type { Replying } from '@/user/model/Replying';
import { fetchReplyingsByDateRangeFromSupabase } from './replying';

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

// Type matching the Firestore fan-out model for compatibility
export interface SupabaseCommenting {
  board: { id: string };
  post: { id: string; title: string; authorId: string };
  comment: { id: string; content: string };
  createdAt: Date;
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
