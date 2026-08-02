import type { Database } from '@/shared/external/database.types';
import type { Post } from '@/post/model/Post';
import { createTimestamp } from '@/shared/model/Timestamp';
import { computeWeekDaysFromFirstDay } from '@/post/utils/weekDays';
import { parsePostVisibility, parsePostContentJson } from '@/post/external/post.parser';

/**
 * Columns every feed query projects (see {@link FEED_POST_SELECT}). Derived from
 * the generated `posts_feed` view type so a column rename or removal surfaces
 * here at compile time. The view drops the base table's NOT NULL constraints, so
 * every column is nullable — {@link mapToPost} classifies each null explicitly
 * rather than trusting the row.
 */
type PostFeedColumns = Pick<
  Database['public']['Views']['posts_feed']['Row'],
  | 'id'
  | 'board_id'
  | 'author_id'
  | 'author_name'
  | 'title'
  | 'content_preview'
  | 'thumbnail_image_url'
  | 'visibility'
  | 'count_of_comments'
  | 'count_of_replies'
  | 'count_of_likes'
  | 'engagement_score'
  | 'week_days_from_first_day'
  | 'created_at'
  | 'updated_at'
  | 'board_first_day'
  | 'author_profile_photo_url'
>;

/**
 * `content` / `content_json` are only projected by the single-post `select('*')`
 * path (fetchPost in postUtils), not by feed queries — hence optional.
 */
type PostContentColumns = Partial<
  Pick<Database['public']['Views']['posts_feed']['Row'], 'content' | 'content_json'>
>;

/**
 * Legacy base-table (`posts`) PostgREST embeds. The feed view exposes flat
 * `board_first_day` / `author_profile_photo_url` columns instead, so current
 * queries never populate these; retained so a row read from the base table with
 * joins still maps.
 */
interface LegacyPostEmbeds {
  boards: { first_day: string | null } | { first_day: string | null }[];
  users: { profile_photo_url: string | null } | { profile_photo_url: string | null }[];
  comments: { count: number }[];
  replies: { count: number }[];
}

export type PostFeedRow = PostFeedColumns & PostContentColumns & Partial<LegacyPostEmbeds>;

/** Explicit column list for feed queries against `posts_feed`.
 *  The view exposes flat `board_first_day` / `author_profile_photo_url`
 *  instead of PostgREST joins, and denormalized `count_of_comments` /
 *  `count_of_replies` already replace the per-row `comments(count)` /
 *  `replies(count)` scalar subqueries the counter migration dropped —
 *  `mapToPost` falls back to those cached counters. */
export const FEED_POST_SELECT =
  'id, board_id, author_id, author_name, title, content_preview, thumbnail_image_url, visibility, count_of_comments, count_of_replies, count_of_likes, engagement_score, week_days_from_first_day, created_at, updated_at, board_first_day, author_profile_photo_url';

/**
 * Identity/temporal fields the DB guarantees NOT NULL but the view types as
 * nullable. A null here means a corrupt row, so we fail loud rather than emit a
 * Post with an empty id or an epoch-1970 `createdAt` (`new Date(null)`). The
 * global QueryCache.onError reports the throw to Sentry.
 */
function required<T>(value: T | null | undefined, field: string, rowId: unknown): T {
  if (value === null || value === undefined) {
    throw new Error(`posts_feed row ${String(rowId)}: missing required field '${field}'`);
  }
  return value;
}

/** Map a `posts_feed` row (or a legacy joined `posts` row) to the Post model. */
export function mapToPost(row: PostFeedRow): Post {
  const id = required(row.id, 'id', row.id);
  const boardId = required(row.board_id, 'board_id', id);
  const authorId = required(row.author_id, 'author_id', id);
  const createdAt = required(row.created_at, 'created_at', id);

  const commentCount = row.comments?.[0]?.count ?? row.count_of_comments ?? 0;
  const replyCount = row.replies?.[0]?.count ?? row.count_of_replies ?? 0;

  const boardEmbed = Array.isArray(row.boards) ? row.boards[0] : row.boards;
  const firstDay = row.board_first_day ?? boardEmbed?.first_day ?? null;
  const weekDays = firstDay
    ? computeWeekDaysFromFirstDay(firstDay, createdAt)
    : (row.week_days_from_first_day ?? undefined);

  const usersEmbed = Array.isArray(row.users) ? row.users[0] : row.users;
  const profilePhotoURL = row.author_profile_photo_url ?? usersEmbed?.profile_photo_url ?? null;

  return {
    id,
    boardId,
    title: row.title ?? '',
    content: row.content ?? '',
    contentPreview: row.content_preview ?? row.content ?? null,
    contentJson: parsePostContentJson(row.content_json),
    thumbnailImageURL: row.thumbnail_image_url,
    authorId,
    authorName: row.author_name ?? '',
    createdAt: createTimestamp(new Date(createdAt)),
    updatedAt: row.updated_at ? createTimestamp(new Date(row.updated_at)) : undefined,
    countOfComments: commentCount,
    countOfReplies: replyCount,
    countOfLikes: row.count_of_likes ?? 0,
    engagementScore: row.engagement_score ?? 0,
    weekDaysFromFirstDay: weekDays,
    visibility: parsePostVisibility(row.visibility),
    authorProfileImageURL: profilePhotoURL || undefined,
  };
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
