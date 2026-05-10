import { getSupabaseClient } from '@/shared/api/supabaseClient';

// Supabase row type for posts query results
interface PostRow {
  id: string;
  board_id: string;
  title: string;
  content_length: number;
  created_at: string;
}

// Type matching the Firestore fan-out model for compatibility
export interface SupabasePosting {
  board: { id: string };
  post: { id: string; title: string; contentLength: number };
  createdAt: Date;
  isRecovered?: boolean;
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
