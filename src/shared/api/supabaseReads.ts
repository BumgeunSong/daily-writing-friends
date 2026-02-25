/**
 * Supabase Read Functions
 *
 * Direct table queries replacing Firestore fan-out subcollections AND core entity reads.
 * Uses indexes: idx_posts_author_created, idx_comments_user_created, idx_replies_user_created,
 *   idx_posts_board_created, idx_posts_board_engagement, idx_comments_post_created,
 *   idx_replies_comment_created, idx_permissions_user
 */

import { getSupabaseClient } from './supabaseClient';
import type { Board } from '@/board/model/Board';
import type { Post } from '@/post/model/Post';
import { PostVisibility } from '@/post/model/Post';
import type { Comment } from '@/comment/model/Comment';
import type { Reply } from '@/comment/model/Reply';
import type { Reaction } from '@/comment/model/Reaction';
import type { User } from '@/user/model/User';
import { Timestamp } from 'firebase/firestore';

/** Format string array as PostgREST `in.(...)` value with proper quoting */
function formatInFilter(values: string[]): string {
  const quoted = values.map((v) => `"${v.replace(/"/g, '""')}"`);
  return `(${quoted.join(',')})`;
}

/**
 * Compute the number of working days (Mon-Fri) from a board's first day to a post's creation date.
 *
 * Mirrors the Cloud Function `updatePostDaysFromFirstDay` with two differences:
 * - Uses postCreatedAt (fixed) instead of new Date() (current time).
 * - Computes KST weekday via modular arithmetic to avoid DST issues in non-KST browsers.
 *
 * Both dates are projected to KST (Asia/Seoul) calendar dates before counting.
 */
export function computeWeekDaysFromFirstDay(boardFirstDay: string, postCreatedAt: string): number {
  const kstStart = new Date(new Date(boardFirstDay).toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const kstEnd = new Date(new Date(postCreatedAt).toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  kstStart.setHours(0, 0, 0, 0);
  kstEnd.setHours(0, 0, 0, 0);

  const msPerDay = 86400000;
  const daysDiff = Math.ceil((kstEnd.getTime() - kstStart.getTime()) / msPerDay);

  // Use modular arithmetic from the known KST start day to avoid creating
  // intermediate Date objects that could be affected by local DST transitions.
  const startDay = kstStart.getDay();
  let workingDays = 0;
  for (let i = 0; i < daysDiff; i++) {
    const day = (startDay + i) % 7;
    if (day !== 0 && day !== 6) workingDays++;
  }

  return workingDays;
}

// Supabase row types for query results
interface PostRow {
  id: string;
  board_id: string;
  title: string;
  content: string | null;
  created_at: string;
}

/** Post row with embedded resources from PostgREST joins */
interface PostRowWithEmbeds {
  id: string;
  board_id: string;
  author_id: string;
  author_name: string;
  title: string;
  content: string;
  content_json: unknown;
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
  comments?: { count: number }[];
  replies?: { count: number }[];
  users?: { profile_photo_url: string | null } | { profile_photo_url: string | null }[];
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => {
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

// --- Boards ---

/**
 * Fetch boards the user has permission to access.
 * Replaces: fetchBoardsWithUserPermissions in boardUtils.ts
 * Uses index: idx_permissions_user
 */
export async function fetchBoardsFromSupabase(userId: string): Promise<Board[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_board_permissions')
    .select(`
      board_id,
      permission,
      boards!inner (
        id,
        title,
        description,
        first_day,
        last_day,
        cohort,
        created_at
      )
    `)
    .eq('user_id', userId);

  if (error) {
    console.error('Supabase fetchBoards error:', error);
    return [];
  }

  // Fetch waiting users for each board
  const boardIds = (data || []).map((row: { board_id: string }) => row.board_id);
  const { data: waitingData } = await supabase
    .from('board_waiting_users')
    .select('board_id, user_id')
    .in('board_id', boardIds.length > 0 ? boardIds : ['__none__']);

  const waitingByBoard: Record<string, string[]> = {};
  for (const w of waitingData || []) {
    if (!waitingByBoard[w.board_id]) waitingByBoard[w.board_id] = [];
    waitingByBoard[w.board_id].push(w.user_id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => {
    const board = Array.isArray(row.boards) ? row.boards[0] : row.boards;
    return {
      id: board.id,
      title: board.title,
      description: board.description || '',
      createdAt: new Date(board.created_at),
      firstDay: board.first_day ? Timestamp.fromDate(new Date(board.first_day)) : undefined,
      lastDay: board.last_day ? Timestamp.fromDate(new Date(board.last_day)) : undefined,
      cohort: board.cohort ?? undefined,
      waitingUsersIds: waitingByBoard[board.id] || [],
    };
  });
}

/**
 * Fetch a single board by ID.
 * Replaces: fetchBoardById in boardUtils.ts
 */
export async function fetchBoardByIdFromSupabase(boardId: string): Promise<Board | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('boards')
    .select('id, title, description, first_day, last_day, cohort, created_at')
    .eq('id', boardId)
    .single();

  if (error || !data) {
    if (error?.code !== 'PGRST116') { // not "no rows" error
      console.error('Supabase fetchBoardById error:', error);
    }
    return null;
  }

  // Fetch waiting users
  const { data: waitingData } = await supabase
    .from('board_waiting_users')
    .select('user_id')
    .eq('board_id', boardId);

  return {
    id: data.id,
    title: data.title,
    description: data.description || '',
    createdAt: new Date(data.created_at),
    firstDay: data.first_day ? Timestamp.fromDate(new Date(data.first_day)) : undefined,
    lastDay: data.last_day ? Timestamp.fromDate(new Date(data.last_day)) : undefined,
    cohort: data.cohort ?? undefined,
    waitingUsersIds: (waitingData || []).map((w: { user_id: string }) => w.user_id),
  };
}

/**
 * Fetch board title by ID.
 * Replaces: fetchBoardTitle in boardUtils.ts
 */
export async function fetchBoardTitleFromSupabase(boardId: string): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('boards')
    .select('title')
    .eq('id', boardId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return 'Board not found';
    }
    console.error('Supabase fetchBoardTitle error:', error);
    throw error;
  }

  if (!data) {
    return 'Board not found';
  }

  return data.title;
}

// --- Posts ---

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
    .select('*, boards(first_day), comments(count), replies(count), users!author_id(profile_photo_url)')
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
    .select('*, boards(first_day), comments(count), replies(count), users!author_id(profile_photo_url)')
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

/** Map a Supabase posts row (with embedded counts and board data) to Post model */
export function mapRowToPost(row: PostRowWithEmbeds): Post {
  // Extract live counts from embedded resources (PostgREST returns [{count: N}] for one-to-many)
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
    content: row.content,
    contentJson: row.content_json as Post['contentJson'],
    thumbnailImageURL: row.thumbnail_image_url,
    authorId: row.author_id,
    authorName: row.author_name,
    createdAt: Timestamp.fromDate(new Date(row.created_at)),
    updatedAt: row.updated_at ? Timestamp.fromDate(new Date(row.updated_at)) : undefined,
    countOfComments: commentCount,
    countOfReplies: replyCount,
    countOfLikes: row.count_of_likes,
    engagementScore: row.engagement_score,
    weekDaysFromFirstDay: weekDays,
    visibility: (row.visibility as PostVisibility) || PostVisibility.PUBLIC,
    authorProfileImageURL: user?.profile_photo_url || undefined,
  };
}

// --- Comments ---

/**
 * Fetch all comments for a post.
 * Replaces: fetchCommentsOnce in comment.ts
 * Uses index: idx_comments_post_created
 */
export async function fetchCommentsFromSupabase(
  postId: string,
  blockedByUsers: string[] = [],
): Promise<Comment[]> {
  const supabase = getSupabaseClient();

  let q = supabase
    .from('comments')
    .select('id, content, user_id, user_name, user_profile_image, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (blockedByUsers.length > 0) {
    q = q.not('user_id', 'in', formatInFilter(blockedByUsers));
  }

  const { data, error } = await q;

  if (error) {
    console.error('Supabase fetchComments error:', error);
    throw error;
  }

  return (data || []).map(mapRowToComment);
}

/**
 * Fetch a single comment by ID.
 * Replaces: fetchCommentById in comment.ts
 */
export async function fetchCommentByIdFromSupabase(
  commentId: string,
): Promise<Comment | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('comments')
    .select('id, content, user_id, user_name, user_profile_image, created_at')
    .eq('id', commentId)
    .single();

  if (error || !data) {
    if (error?.code !== 'PGRST116') {
      console.error('Supabase fetchCommentById error:', error);
    }
    return null;
  }

  return mapRowToComment(data);
}

function mapRowToComment(row: {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  user_profile_image: string | null;
  created_at: string;
}): Comment {
  return {
    id: row.id,
    content: row.content,
    userId: row.user_id,
    userName: row.user_name,
    userProfileImage: row.user_profile_image || '',
    createdAt: Timestamp.fromDate(new Date(row.created_at)),
  };
}

// --- Users ---

/**
 * Fetch a single user by ID.
 * Replaces: fetchUser in user.ts
 */
export async function fetchUserFromSupabase(uid: string): Promise<User | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, timezone, known_buddy_uid')
    .eq('id', uid)
    .single();

  if (error || !data) {
    if (error?.code !== 'PGRST116') {
      console.error('Supabase fetchUser error:', error);
    }
    return null;
  }

  // Fetch board permissions
  const { data: permData } = await supabase
    .from('user_board_permissions')
    .select('board_id, permission')
    .eq('user_id', uid);

  const boardPermissions: Record<string, 'read' | 'write'> = {};
  for (const p of permData || []) {
    boardPermissions[p.board_id] = p.permission as 'read' | 'write';
  }

  // Fetch known buddy info if exists
  let knownBuddy: User['knownBuddy'] = undefined;
  if (data.known_buddy_uid) {
    const { data: buddyData } = await supabase
      .from('users')
      .select('id, nickname, profile_photo_url')
      .eq('id', data.known_buddy_uid)
      .single();
    if (buddyData) {
      knownBuddy = {
        uid: buddyData.id,
        nickname: buddyData.nickname,
        profilePhotoURL: buddyData.profile_photo_url,
      };
    }
  }

  return {
    uid: data.id,
    realName: data.real_name,
    nickname: data.nickname,
    email: data.email,
    profilePhotoURL: data.profile_photo_url,
    bio: data.bio,
    phoneNumber: data.phone_number,
    referrer: data.referrer,
    boardPermissions,
    updatedAt: null,
    knownBuddy,
    profile: data.timezone ? { timezone: data.timezone } : undefined,
  };
}

/**
 * Fetch all users.
 * Replaces: fetchAllUsers in user.ts
 */
export async function fetchAllUsersFromSupabase(): Promise<User[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, real_name, nickname, email, profile_photo_url, bio, phone_number, referrer, timezone');

  if (error) {
    console.error('Supabase fetchAllUsers error:', error);
    return [];
  }

  return (data || []).map((row) => ({
    uid: row.id,
    realName: row.real_name,
    nickname: row.nickname,
    email: row.email,
    profilePhotoURL: row.profile_photo_url,
    bio: row.bio,
    phoneNumber: row.phone_number,
    referrer: row.referrer,
    boardPermissions: {},
    updatedAt: null,
  }));
}

/**
 * Fetch users with write permission on given boards.
 * Replaces: fetchUsersWithBoardPermission in user.ts
 * Uses index: idx_permissions_board
 */
export async function fetchUsersWithBoardPermissionFromSupabase(
  boardIds: string[]
): Promise<User[]> {
  if (boardIds.length === 0) return [];

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('user_board_permissions')
    .select(`
      user_id,
      board_id,
      permission,
      users!inner (
        id,
        real_name,
        nickname,
        email,
        profile_photo_url,
        bio,
        phone_number,
        referrer,
        timezone
      )
    `)
    .in('board_id', boardIds)
    .eq('permission', 'write');

  if (error) {
    console.error('Supabase fetchUsersWithBoardPermission error:', error);
    return [];
  }

  // Deduplicate users (a user may have permissions on multiple boards)
  const userMap = new Map<string, User>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (data || []) as any[]) {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    if (!userMap.has(u.id)) {
      userMap.set(u.id, {
        uid: u.id,
        realName: u.real_name,
        nickname: u.nickname,
        email: u.email,
        profilePhotoURL: u.profile_photo_url,
        bio: u.bio,
        phoneNumber: u.phone_number,
        referrer: u.referrer,
        boardPermissions: {},
        updatedAt: null,
        profile: u.timezone ? { timezone: u.timezone } : undefined,
      });
    }
    const user = userMap.get(u.id)!;
    user.boardPermissions[row.board_id] = row.permission as 'read' | 'write';
  }

  return Array.from(userMap.values());
}

// --- Replies ---

/**
 * Fetch all replies for a comment.
 * Replaces: fetchRepliesOnce in reply.ts
 * Uses index: idx_replies_comment_created
 */
export async function fetchRepliesFromSupabase(
  commentId: string,
  blockedByUsers: string[] = [],
): Promise<Reply[]> {
  const supabase = getSupabaseClient();

  let q = supabase
    .from('replies')
    .select('id, content, user_id, user_name, user_profile_image, created_at')
    .eq('comment_id', commentId)
    .order('created_at', { ascending: true });

  if (blockedByUsers.length > 0) {
    q = q.not('user_id', 'in', formatInFilter(blockedByUsers));
  }

  const { data, error } = await q;

  if (error) {
    console.error('Supabase fetchReplies error:', error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    content: row.content,
    userId: row.user_id,
    userName: row.user_name,
    userProfileImage: row.user_profile_image || '',
    createdAt: Timestamp.fromDate(new Date(row.created_at)),
  }));
}

/**
 * Fetch reply count for a comment.
 * Replaces: fetchReplyCountOnce in reply.ts
 */
export async function fetchReplyCountFromSupabase(
  commentId: string,
  blockedByUsers: string[] = [],
): Promise<number> {
  const supabase = getSupabaseClient();

  let q = supabase
    .from('replies')
    .select('id', { count: 'exact', head: true })
    .eq('comment_id', commentId);

  if (blockedByUsers.length > 0) {
    q = q.not('user_id', 'in', formatInFilter(blockedByUsers));
  }

  const { count, error } = await q;

  if (error) {
    console.error('Supabase fetchReplyCount error:', error);
    throw error;
  }

  return count ?? 0;
}

/**
 * Fetch a single reply by ID.
 * Replaces: fetchReplyById in reply.ts
 */
export async function fetchReplyByIdFromSupabase(
  replyId: string,
): Promise<Reply | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('replies')
    .select('id, content, user_id, user_name, user_profile_image, created_at')
    .eq('id', replyId)
    .single();

  if (error || !data) {
    if (error?.code !== 'PGRST116') {
      console.error('Supabase fetchReplyById error:', error);
    }
    return null;
  }

  return {
    id: data.id,
    content: data.content,
    userId: data.user_id,
    userName: data.user_name,
    userProfileImage: data.user_profile_image || '',
    createdAt: Timestamp.fromDate(new Date(data.created_at)),
  };
}

// --- Reactions ---

/**
 * Fetch reactions for a comment or reply.
 * Replaces: getReactions in reaction.ts
 * Uses index: idx_reactions_comment or idx_reactions_reply
 */
export async function fetchReactionsFromSupabase(params: {
  commentId: string;
  replyId?: string;
}): Promise<Reaction[]> {
  const supabase = getSupabaseClient();

  let q = supabase
    .from('reactions')
    .select('id, reaction_type, user_id, user_name, user_profile_image, created_at');

  if (params.replyId) {
    q = q.eq('reply_id', params.replyId);
  } else {
    q = q.eq('comment_id', params.commentId);
  }

  const { data, error } = await q;

  if (error) {
    console.error('Supabase fetchReactions error:', error);
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    content: row.reaction_type,
    createdAt: new Date(row.created_at),
    reactionUser: {
      userId: row.user_id,
      userName: row.user_name,
      userProfileImage: row.user_profile_image || '',
    },
  }));
}

/**
 * Batch-fetch reactions for multiple comments in one query.
 * Returns Map<commentId, Reaction[]> for cache seeding.
 */
export async function fetchBatchReactionsForComments(
  commentIds: string[],
): Promise<Map<string, Reaction[]>> {
  if (commentIds.length === 0) return new Map();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('reactions')
    .select('id, comment_id, reaction_type, user_id, user_name, user_profile_image, created_at')
    .in('comment_id', commentIds);

  if (error) {
    console.error('Supabase batch reactions fetch error:', { commentCount: commentIds.length, error });
    throw error;
  }

  const result = new Map<string, Reaction[]>();
  for (const commentId of commentIds) {
    result.set(commentId, []);
  }
  for (const row of data || []) {
    const reactions = result.get(row.comment_id) ?? [];
    reactions.push({
      id: row.id,
      content: row.reaction_type,
      createdAt: new Date(row.created_at),
      reactionUser: {
        userId: row.user_id,
        userName: row.user_name,
        userProfileImage: row.user_profile_image || '',
      },
    });
    result.set(row.comment_id, reactions);
  }
  return result;
}

// --- Notifications ---

/**
 * Fetch notifications for a user from Supabase.
 * Replaces: fetchNotifications in notificationApi.ts
 * Uses index: idx_notifications_recipient_created
 */
export async function fetchNotificationsFromSupabase(
  userId: string,
  limitCount: number,
  after?: string
): Promise<{
  id: string;
  type: string;
  boardId: string;
  postId: string;
  commentId?: string;
  replyId?: string;
  fromUserId: string;
  fromUserProfileImage?: string;
  message: string;
  timestamp: string;
  read: boolean;
}[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limitCount);

  if (after) {
    query = query.lt('created_at', after);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase fetchNotifications error:', error);
    throw error;
  }

  // Batch-fetch actor profile images
  const actorIds = [...new Set((data || []).map(row => row.actor_id))];
  const profileMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors, error: actorsError } = await supabase
      .from('users')
      .select('id, profile_photo_url')
      .in('id', actorIds);
    if (actorsError) {
      console.error('Supabase fetchNotifications users lookup error:', actorsError);
    }
    for (const actor of actors || []) {
      if (actor.profile_photo_url) {
        profileMap.set(actor.id, actor.profile_photo_url);
      }
    }
  }

  return (data || []).map(row => ({
    id: row.id,
    type: row.type,
    boardId: row.board_id,
    postId: row.post_id,
    commentId: row.comment_id || undefined,
    replyId: row.reply_id || undefined,
    fromUserId: row.actor_id,
    fromUserProfileImage: profileMap.get(row.actor_id) || undefined,
    message: row.message,
    timestamp: row.created_at,
    read: row.read,
  }));
}

// --- Batch Queries (shared by stats + board pages) ---

export interface BasicUserRow {
  id: string;
  real_name: string | null;
  nickname: string | null;
  profile_photo_url: string | null;
}

export async function fetchBatchUsersBasic(userIds: string[]): Promise<BasicUserRow[]> {
  if (userIds.length === 0) return [];
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, real_name, nickname, profile_photo_url')
    .in('id', userIds);
  if (error) {
    console.error('Supabase batch users fetch error:', { userCount: userIds.length, error });
    throw error;
  }
  return (data || []) as BasicUserRow[];
}

export interface UserIdRow {
  user_id: string;
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
    .select('user_id')
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

export const fetchBatchReplyUserIdsByDateRange = (
  userIds: string[], start: Date, end: Date,
) => fetchBatchUserIdRowsByDateRange('replies', userIds, start, end);

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
