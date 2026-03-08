import { getSupabase } from './supabase';
import { extractPreview } from './preview';

export interface PostMetadata {
  id: string;
  title: string;
  preview: string;
  boardTitle: string;
  createdAt: string;
  engagementScore: number;
}

export interface PostContent {
  id: string;
  title: string;
  content: string;
  boardTitle: string;
  authorName: string;
  createdAt: string;
  engagementScore: number;
}

function toMetadata(
  post: { id: string; title: string; content: string; created_at: string; engagement_score: number },
  boardTitle: string
): PostMetadata {
  return {
    id: post.id,
    title: post.title,
    preview: extractPreview(post.content),
    boardTitle,
    createdAt: post.created_at,
    engagementScore: post.engagement_score,
  };
}

/**
 * Get posts by a specific user, with optional board filter.
 */
export async function getMyPosts(
  userId: string,
  options: { board?: string; limit?: number; offset?: number } = {}
): Promise<PostMetadata[]> {
  const { board, limit = 20, offset = 0 } = options;

  const supabase = getSupabase();

  let query = supabase
    .from('posts')
    .select('id, title, content, created_at, engagement_score, board_id, boards(title)')
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (board) {
    // Try matching by board title (partial match)
    const { data: boards } = await supabase
      .from('boards')
      .select('id')
      .ilike('title', `%${board}%`);

    if (boards && boards.length > 0) {
      const boardIds = boards.map((b) => b.id);
      query = query.in('board_id', boardIds);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch posts: ${error.message}`);
  }

  return (data ?? []).map((post) => {
    const boardTitle = (post.boards as unknown as { title: string })?.title ?? '';
    return toMetadata(post, boardTitle);
  });
}

/**
 * Get full content of a single post.
 */
export async function getPostContent(postId: string): Promise<PostContent | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('posts')
    .select('id, title, content, author_name, created_at, engagement_score, board_id, boards(title)')
    .eq('id', postId)
    .single();

  if (error || !data) {
    return null;
  }

  const boardTitle = (data.boards as unknown as { title: string })?.title ?? '';

  return {
    id: data.id,
    title: data.title,
    content: data.content,
    boardTitle,
    authorName: data.author_name,
    createdAt: data.created_at,
    engagementScore: data.engagement_score,
  };
}

/**
 * Get top posts by engagement score, optionally filtered by board.
 */
export async function getBestPosts(
  userId: string,
  options: { board?: string; limit?: number } = {}
): Promise<PostMetadata[]> {
  const { board, limit = 10 } = options;

  const supabase = getSupabase();

  let query = supabase
    .from('posts')
    .select('id, title, content, created_at, engagement_score, board_id, boards(title)')
    .eq('author_id', userId)
    .gt('engagement_score', 0)
    .order('engagement_score', { ascending: false })
    .limit(limit);

  if (board) {
    const { data: boards } = await supabase
      .from('boards')
      .select('id')
      .ilike('title', `%${board}%`);

    if (boards && boards.length > 0) {
      const boardIds = boards.map((b) => b.id);
      query = query.in('board_id', boardIds);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch best posts: ${error.message}`);
  }

  return (data ?? []).map((post) => {
    const boardTitle = (post.boards as unknown as { title: string })?.title ?? '';
    return toMetadata(post, boardTitle);
  });
}

/**
 * Search posts by keyword using ILIKE (case-insensitive partial match).
 */
export async function searchPosts(
  userId: string,
  query: string,
  options: { limit?: number } = {}
): Promise<PostMetadata[]> {
  const { limit = 10 } = options;

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('posts')
    .select('id, title, content, created_at, engagement_score, board_id, boards(title)')
    .eq('author_id', userId)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to search posts: ${error.message}`);
  }

  return (data ?? []).map((post) => {
    const boardTitle = (post.boards as unknown as { title: string })?.title ?? '';
    return toMetadata(post, boardTitle);
  });
}
