import type { Post, ProseMirrorDoc } from '@/post/model/Post';
import type { Json } from '@/shared/external/database.types';
import { getSupabaseClient } from '@/shared/external/supabaseClient';
import { formatInFilter } from '@/shared/external/postgrestFilters';
import { createTimestamp } from '@/shared/model/Timestamp';
import { computeWeekDaysFromFirstDay } from '@/post/utils/weekDays';
import { parsePostVisibility, parsePostContentJson } from '@/post/external/postParsers';

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
 * True when the post was created within the last `days` days from `now`.
 * `now` is injectable for tests; defaults to the current wall clock.
 */
export function isWithinDays(post: Post, days: number, now: Date = new Date()): boolean {
  if (!post.createdAt) return false;
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const postDate = post.createdAt.toDate();
  return postDate >= cutoffDate;
}

/** Post row shape returned by the `posts_feed` view. The view pre-joins
 *  boards/users into flat columns (`board_first_day`, `author_profile_photo_url`)
 *  and masks content fields to NULL for private posts viewed by non-authors.
 *
 *  Embed fields (`boards`, `users`, `comments`, `replies`) remain optional so
 *  legacy queries that still read from the base `posts` table continue to
 *  type-check while we migrate. */
export interface PostRowWithEmbeds {
  id: string;
  board_id: string;
  author_id: string;
  author_name: string;
  title: string;
  content?: string | null;
  content_preview?: string | null;
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
  board_first_day?: string | null;
  author_profile_photo_url?: string | null;
  boards?: { first_day: string | null } | { first_day: string | null }[];
  users?: { profile_photo_url: string | null } | { profile_photo_url: string | null }[];
  comments?: { count: number }[];
  replies?: { count: number }[];
}

/** Explicit column list for feed queries against `posts_feed`.
 *  The view exposes flat `board_first_day` / `author_profile_photo_url`
 *  instead of PostgREST joins, and denormalized `count_of_comments` /
 *  `count_of_replies` already replace the per-row `comments(count)` /
 *  `replies(count)` scalar subqueries main #31 dropped — `mapRowToPost`
 *  falls back to those cached counters. */
export const FEED_POST_SELECT = 'id, board_id, author_id, author_name, title, content_preview, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at, board_first_day, author_profile_photo_url';

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

  return narrowFeedRows(data).map(mapRowToPost);
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

  return narrowFeedRows(data).map(mapRowToPost);
}

/** Narrow rows read from the `posts_feed` view to the non-null row contract.
 *
 *  `posts_feed` is a Postgres view, so Supabase's generated types widen every
 *  column to `T | null` — a view cannot carry the base tables' NOT NULL
 *  guarantees. The selected columns (`id`, `board_id`, `title`, timestamps, …)
 *  are non-null in the underlying `posts`/`boards`/`users` tables, so mapping
 *  code may treat them as present. This boundary narrowing is the single place
 *  that bridge is asserted; `mapRowToPost` handles the genuinely-nullable ones.
 *
 *  Invariant: every column `mapRowToPost` reads must stay listed in
 *  `FEED_POST_SELECT`. The cast erases the row shape, so a dropped column is
 *  caught at runtime, not by the type-checker — keep the two in sync. */
export function narrowFeedRows(
  data: readonly Record<string, unknown>[] | null,
): PostRowWithEmbeds[] {
  return (data ?? []) as unknown as PostRowWithEmbeds[];
}

/** Widen a ProseMirror document to the jsonb `Json` column type at the write
 *  boundary. `Json` may only be imported inside `external/`, so write paths in
 *  UI-layer modules route through here instead of casting to `never`. */
export function toContentJson(doc: ProseMirrorDoc): Json {
  return doc as unknown as Json;
}

/** Map a row from `posts_feed` (or the legacy `posts` query shape) to Post model. */
export function mapRowToPost(row: PostRowWithEmbeds): Post {
  const commentCount = row.comments?.[0]?.count ?? row.count_of_comments ?? 0;
  const replyCount = row.replies?.[0]?.count ?? row.count_of_replies ?? 0;

  const boardEmbed = Array.isArray(row.boards) ? row.boards[0] : row.boards;
  const firstDay = row.board_first_day ?? boardEmbed?.first_day ?? null;
  const weekDays = firstDay
    ? computeWeekDaysFromFirstDay(firstDay, row.created_at)
    : (row.week_days_from_first_day ?? undefined);

  const usersEmbed = Array.isArray(row.users) ? row.users[0] : row.users;
  const profilePhotoURL = row.author_profile_photo_url ?? usersEmbed?.profile_photo_url ?? null;

  return {
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    content: row.content ?? '',
    contentPreview: row.content_preview ?? row.content ?? null,
    contentJson: parsePostContentJson(row.content_json),
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
    visibility: parsePostVisibility(row.visibility),
    authorProfileImageURL: profilePhotoURL || undefined,
  };
}
