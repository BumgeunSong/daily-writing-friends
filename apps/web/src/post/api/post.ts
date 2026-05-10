import type { Post } from '@/post/model/Post';
import { PostVisibility } from '@/post/model/Post';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { formatInFilter } from '@/shared/api/postgrestFilters';
import { createTimestamp } from '@/shared/model/Timestamp';
import { computeWeekDaysFromFirstDay } from '@/post/utils/weekDays';

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
 * 게시글이 최근 7일 내인지 확인
 */
export function isWithinDays(post: Post, days: number): boolean {
  if (!post.createdAt) return false;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const postDate = post.createdAt.toDate();
  return postDate >= cutoffDate;
}

/** Post row with embedded resources from PostgREST joins.
 *  Feed queries select content_preview (500 chars) instead of full content/content_json.
 *  Detail queries select * which includes both content and content_preview. */
interface PostRowWithEmbeds {
  id: string;
  board_id: string;
  author_id: string;
  author_name: string;
  title: string;
  content?: string;
  content_preview?: string;
  content_json?: unknown;
  thumbnail_image_url: string | null;
  visibility: string | null;
  count_of_comments: number;
  count_of_replies: number;
  count_of_likes: number;
  engagement_score: number;
  week_days_from_first_day: number | null;
  created_at: string;
  updated_at: string;
  boards?: { first_day: string | null } | { first_day: string | null }[];
  users?: { profile_photo_url: string | null } | { profile_photo_url: string | null }[];
  comments?: { count: number }[];
  replies?: { count: number }[];
}

/** Explicit column list for feed queries — excludes content and content_json to reduce transfer. */
export const FEED_POST_SELECT = 'id, board_id, author_id, author_name, title, content_preview, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at, comments(count), replies(count)';

/**
 * Fetch recent posts for a board.
 * Replaces: fetchRecentPosts in post.ts
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
    .from('posts')
    .select(`${FEED_POST_SELECT}, boards(first_day), users!author_id(profile_photo_url)`)
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

  return (data || []).map(mapRowToPost);
}

/**
 * Fetch best (highest engagement) posts for a board.
 * Replaces: fetchBestPosts in post.ts
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
    .from('posts')
    .select(`${FEED_POST_SELECT}, boards(first_day), users!author_id(profile_photo_url)`)
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

  return (data || []).map(mapRowToPost);
}

/** Map a Supabase posts row (with board and user embeds) to Post model */
export function mapRowToPost(row: PostRowWithEmbeds): Post {
  // Prefer live embedded counts (PostgREST aggregates) over cached counter columns
  const commentCount = row.comments?.[0]?.count ?? row.count_of_comments ?? 0;
  const replyCount = row.replies?.[0]?.count ?? row.count_of_replies ?? 0;

  // Compute weekDaysFromFirstDay from board's first_day if available via embedded join
  const board = Array.isArray(row.boards) ? row.boards[0] : row.boards;
  const weekDays = board?.first_day
    ? computeWeekDaysFromFirstDay(board.first_day, row.created_at)
    : (row.week_days_from_first_day ?? undefined);

  // Extract profile photo from joined users data (optional — not all callers include the join)
  const usersData = Array.isArray(row.users) ? row.users[0] : row.users;
  const user = usersData ?? null;

  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    content: row.content ?? row.content_preview ?? '',
    contentJson: row.content_json ? (row.content_json as Post['contentJson']) : undefined,
    thumbnailImageURL: row.thumbnail_image_url,
    authorId: row.author_id,
    authorName: row.author_name,
    createdAt: createTimestamp(new Date(row.created_at)),
    updatedAt: row.updated_at ? createTimestamp(new Date(row.updated_at)) : undefined,
    countOfComments: commentCount,
    countOfReplies: replyCount,
    countOfLikes: row.count_of_likes,
    engagementScore: row.engagement_score,
    weekDaysFromFirstDay: weekDays,
    visibility: (row.visibility as PostVisibility) || PostVisibility.PUBLIC,
    authorProfileImageURL: user?.profile_photo_url || undefined,
  };
}
