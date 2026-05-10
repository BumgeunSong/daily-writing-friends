import { getSupabaseClient } from '@/shared/api/supabaseClient';

/** Shared join fields for posts table */
interface PostJoinFields {
  id: string;
  title: string;
  author_id: string;
  board_id: string;
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

// Type matching the Firestore fan-out model for compatibility
export interface SupabaseReplying {
  board: { id: string };
  post: { id: string; title: string; authorId: string };
  comment: { id: string; authorId: string };
  reply: { id: string };
  createdAt: Date;
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
