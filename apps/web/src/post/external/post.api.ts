import type { Post } from '@/post/model/Post';
import { getSupabaseClient } from '@/shared/external/supabaseClient';
import { formatInFilter } from '@/shared/external/postgrestFilters';
import { FEED_POST_SELECT, mapToPost } from '@/post/external/post.mapper';

/**
 * 최근 게시글을 불러옴 (createdAt 내림차순, blockedByUsers 서버사이드 필터링)
 */
export async function fetchRecentPosts(
  boardId: string,
  limitCount: number,
  blockedByUsers: string[] = [],
  after?: Date
): Promise<Post[]> {
  return fetchRecentPostsFromSupabase(boardId, limitCount, blockedByUsers, after);
}

/**
 * engagementScore 높은 순으로 게시글 불러옴 (서버 사이드 정렬)
 * 클라이언트에서 7일 필터링 수행
 */
export async function fetchBestPosts(
  boardId: string,
  limitCount: number,
  blockedByUsers: string[] = [],
  afterScore?: number
): Promise<Post[]> {
  return fetchBestPostsFromSupabase(boardId, limitCount, blockedByUsers, afterScore);
}

/**
 * Fetch recent posts for a board.
 * Uses index: idx_posts_board_created
 */
export async function fetchRecentPostsFromSupabase(
  boardId: string,
  limitCount: number,
  blockedByUsers: string[] = [],
  after?: Date
): Promise<Post[]> {
  const supabase = getSupabaseClient();

  let q = supabase
    .from('posts_feed')
    .select(FEED_POST_SELECT)
    .eq('board_id', boardId)
    .order('created_at', { ascending: false });

  if (blockedByUsers.length > 0) {
    // Supabase doesn't have a direct not-in for arrays > 0, use .not().in()
    q = q.not('author_id', 'in', formatInFilter(blockedByUsers));
  }

  if (after) {
    q = q.lt('created_at', after.toISOString());
  }

  if (limitCount) {
    q = q.limit(limitCount);
  }

  const { data, error } = await q;

  if (error) {
    console.error('Supabase fetchRecentPosts error:', error);
    throw error;
  }

  return (data || []).map(mapToPost);
}

/**
 * Fetch best (highest engagement) posts for a board.
 * Uses index: idx_posts_board_engagement
 */
export async function fetchBestPostsFromSupabase(
  boardId: string,
  limitCount: number,
  blockedByUsers: string[] = [],
  afterScore?: number
): Promise<Post[]> {
  const supabase = getSupabaseClient();

  let q = supabase
    .from('posts_feed')
    .select(FEED_POST_SELECT)
    .eq('board_id', boardId)
    .order('engagement_score', { ascending: false })
    .limit(limitCount);

  if (blockedByUsers.length > 0) {
    q = q.not('author_id', 'in', formatInFilter(blockedByUsers));
  }

  if (afterScore !== undefined) {
    q = q.lt('engagement_score', afterScore);
  }

  const { data, error } = await q;

  if (error) {
    console.error('Supabase fetchBestPosts error:', error);
    throw error;
  }

  return (data || []).map(mapToPost);
}
