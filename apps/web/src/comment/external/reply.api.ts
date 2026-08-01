import { type AuthorEmbed, mapToAuthor } from '@/comment/external/authorEmbed';
import type { Reply } from '@/comment/model/Reply';
import type { Database } from '@/shared/external/database.types';
import { getSupabaseClient, throwOnError } from '@/shared/external/supabaseClient';
import { formatInFilter } from '@/shared/external/postgrestFilters';
import { createTimestamp } from '@/shared/model/Timestamp';

type ReplyRow = Pick<
  Database['public']['Tables']['replies']['Row'],
  'id' | 'content' | 'user_id' | 'user_name' | 'user_profile_image' | 'created_at'
> & { author: AuthorEmbed | AuthorEmbed[] | null };

const REPLY_SELECT =
  'id, content, user_id, user_name, user_profile_image, created_at, author:users!user_id(profile_photo_url, nickname)';

/** Pure: project a replies row (with its joined author) onto the domain Reply. */
export function mapToReply(row: ReplyRow): Reply {
  return {
    id: row.id,
    content: row.content,
    userId: row.user_id,
    userName: row.user_name,
    userProfileImage: row.user_profile_image || '',
    author: mapToAuthor(row.author),
    createdAt: createTimestamp(new Date(row.created_at)),
  };
}

/**
 * 답글 추가 (순수 데이터 mutation 함수)
 */
export async function createReply(
  _boardId: string,
  postId: string,
  commentId: string,
  content: string,
  userId: string,
  userName: string,
  userProfileImage: string,
) {
  const supabase = getSupabaseClient();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  throwOnError(await supabase.from('replies').insert({
    id,
    comment_id: commentId,
    post_id: postId,
    user_id: userId,
    user_name: userName,
    user_profile_image: userProfileImage,
    content,
    created_at: createdAt,
  }));
}

/**
 * 답글 수정 (순수 데이터 mutation 함수)
 */
export async function updateReplyToComment(
  _boardId: string,
  _postId: string,
  _commentId: string,
  replyId: string,
  content: string,
) {
  const supabase = getSupabaseClient();
  throwOnError(await supabase.from('replies').update({ content }).eq('id', replyId));
}

/**
 * 답글 삭제 (순수 데이터 mutation 함수)
 */
export async function deleteReplyToComment(
  _boardId: string,
  _postId: string,
  _commentId: string,
  replyId: string,
) {
  const supabase = getSupabaseClient();
  throwOnError(await supabase.from('replies').delete().eq('id', replyId));
}

/**
 * 답글 목록을 한 번만 가져오는 함수 (blockedByUsers 서버사이드 필터링 지원)
 */
export async function fetchRepliesOnce(
  _boardId: string,
  _postId: string,
  commentId: string,
  blockedByUsers: string[] = [],
): Promise<Reply[]> {
  return fetchRepliesFromSupabase(commentId, blockedByUsers);
}

/**
 * 답글 개수 한 번만 가져오기 (blockedByUsers 서버사이드 필터링 지원)
 */
export async function fetchReplyCountOnce(
  _boardId: string,
  _postId: string,
  commentId: string,
  blockedByUsers: string[] = [],
): Promise<number> {
  return fetchReplyCountFromSupabase(commentId, blockedByUsers);
}

/**
 * 답글 단일 조회
 */
export async function fetchReplyById(
  _boardId: string,
  _postId: string,
  _commentId: string,
  replyId: string,
): Promise<Reply | null> {
  return fetchReplyByIdFromSupabase(replyId);
}

// --- Replies ---

/**
 * Fetch all replies for a comment.
 * Uses index: idx_replies_comment_created
 */
export async function fetchRepliesFromSupabase(
  commentId: string,
  blockedByUsers: string[] = [],
): Promise<Reply[]> {
  const supabase = getSupabaseClient();

  let q = supabase
    .from('replies')
    .select(REPLY_SELECT)
    .eq('comment_id', commentId)
    .order('created_at', { ascending: true });

  if (blockedByUsers.length > 0) {
    q = q.not('user_id', 'in', formatInFilter(blockedByUsers));
  }

  const { data, error } = await q;

  if (error) throw error;
  return (data ?? []).map(mapToReply);
}

/**
 * Fetch reply count for a comment.
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

  if (error) throw error;
  return count ?? 0;
}

/**
 * Fetch a single reply by ID. Returns null only when the reply does not exist.
 */
export async function fetchReplyByIdFromSupabase(
  replyId: string,
): Promise<Reply | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('replies')
    .select(REPLY_SELECT)
    .eq('id', replyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no rows for this id
    throw error;
  }

  return mapToReply(data);
}
