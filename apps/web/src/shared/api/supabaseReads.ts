/* eslint-disable local/no-new-shared-supabase-fetch -- file scheduled for removal; existing exports are being moved out per docs/plans/2026-05-10-supabasereads-feature-split.md */
/**
 * Supabase Read Functions
 *
 * Direct table queries replacing Firestore fan-out subcollections AND core entity reads.
 * Uses indexes: idx_posts_author_created, idx_comments_user_created, idx_replies_user_created,
 *   idx_posts_board_created, idx_posts_board_engagement, idx_comments_post_created,
 *   idx_replies_comment_created, idx_permissions_user
 */

import { getSupabaseClient, isNetworkError, SupabaseNetworkError } from './supabaseClient';
import type { Board } from '@/board/model/Board';
import type { User } from '@/user/model/User';
import { createTimestamp } from '@/shared/model/Timestamp';

/** Format string array as PostgREST `in.(...)` value with proper quoting */
export function formatInFilter(values: string[]): string {
  const quoted = values.map((v) => `"${v.replace(/"/g, '""')}"`);
  return `(${quoted.join(',')})`;
}

// Supabase row types for query results
interface PostRow {
  id: string;
  board_id: string;
  title: string;
  content_length: number;
  created_at: string;
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

interface BoardJoinRow {
  id: string;
  title: string;
  description: string | null;
  first_day: string | null;
  last_day: string | null;
  cohort: number | null;
  created_at: string;
}

/** Row from: user_board_permissions + boards!inner join */
interface BoardPermissionWithJoins {
  board_id: string;
  permission: string;
  boards: BoardJoinRow | BoardJoinRow[];
}

interface UserJoinRow {
  id: string;
  real_name: string | null;
  nickname: string | null;
  email: string | null;
  profile_photo_url: string | null;
  bio: string | null;
  phone_number: string | null;
  kakao_id: string | null;
  referrer: string | null;
  onboarding_complete: boolean;
  timezone: string | null;
}

/** Row from: user_board_permissions + users!inner join */
interface UserPermissionWithJoins {
  user_id: string;
  board_id: string;
  permission: string;
  users: UserJoinRow | UserJoinRow[];
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

  return ((data || []) as BoardPermissionWithJoins[]).map((row) => {
    const board = Array.isArray(row.boards) ? row.boards[0] : row.boards;
    return {
      id: board.id,
      title: board.title,
      description: board.description || '',
      createdAt: new Date(board.created_at),
      firstDay: board.first_day ? createTimestamp(new Date(board.first_day)) : undefined,
      lastDay: board.last_day ? createTimestamp(new Date(board.last_day)) : undefined,
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
    firstDay: data.first_day ? createTimestamp(new Date(data.first_day)) : undefined,
    lastDay: data.last_day ? createTimestamp(new Date(data.last_day)) : undefined,
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

// --- Users ---

/**
 * Fetch a single user by ID.
 * Replaces: fetchUser in user.ts
 */
export async function fetchUserFromSupabase(uid: string): Promise<User | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, real_name, nickname, email, profile_photo_url, bio, phone_number, kakao_id, referrer, onboarding_complete, timezone, known_buddy_uid')
    .eq('id', uid)
    .single();

  if (error) {
    if (isNetworkError(error)) {
      throw new SupabaseNetworkError(error);
    }
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Supabase fetchUser error:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  // Fetch board permissions
  const { data: permData, error: permError } = await supabase
    .from('user_board_permissions')
    .select('board_id, permission')
    .eq('user_id', uid);

  if (permError) {
    if (isNetworkError(permError)) {
      throw new SupabaseNetworkError(permError);
    }
    console.error('Supabase fetchUser board permissions error:', permError);
    throw permError;
  }

  const boardPermissions: Record<string, 'read' | 'write'> = {};
  for (const p of permData || []) {
    boardPermissions[p.board_id] = p.permission as 'read' | 'write';
  }

  // Fetch known buddy info if exists (optional — log and continue on failure)
  let knownBuddy: User['knownBuddy'] = undefined;
  if (data.known_buddy_uid) {
    const { data: buddyData, error: buddyError } = await supabase
      .from('users')
      .select('id, nickname, profile_photo_url')
      .eq('id', data.known_buddy_uid)
      .single();
    if (buddyError) {
      console.error('Supabase fetchUser knownBuddy error:', buddyError);
    } else if (buddyData) {
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
    kakaoId: data.kakao_id,
    referrer: data.referrer,
    onboardingComplete: data.onboarding_complete ?? false,
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
    .select('id, real_name, nickname, email, profile_photo_url, bio, phone_number, kakao_id, referrer, onboarding_complete, timezone');

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
    kakaoId: row.kakao_id,
    referrer: row.referrer,
    onboardingComplete: row.onboarding_complete ?? false,
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
        kakao_id,
        referrer,
        onboarding_complete,
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
  for (const row of (data || []) as UserPermissionWithJoins[]) {
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
        kakaoId: u.kakao_id,
        referrer: u.referrer,
        onboardingComplete: u.onboarding_complete ?? false,
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
  created_at: string;
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
    .select('user_id, created_at')
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

export const fetchBatchCommentCountsByDateRange = fetchBatchCommentUserIdsByDateRange;

export const fetchBatchReplyUserIdsByDateRange = (
  userIds: string[], start: Date, end: Date,
) => fetchBatchUserIdRowsByDateRange('replies', userIds, start, end);

export const fetchBatchReplyCountsByDateRange = fetchBatchReplyUserIdsByDateRange;

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
