import { type AuthorEmbed, mapToAuthor } from '@/comment/external/authorEmbed';
import type { Comment } from '@/comment/model/Comment';
import type { Database } from '@/shared/external/database.types';
import { getSupabaseClient, throwOnError } from '@/shared/external/supabaseClient';
import { formatInFilter } from '@/shared/external/postgrestFilters';
import { createTimestamp } from '@/shared/model/Timestamp';

type CommentRow = Pick<
  Database['public']['Tables']['comments']['Row'],
  'id' | 'content' | 'user_id' | 'user_name' | 'user_profile_image' | 'created_at'
> & { author: AuthorEmbed | AuthorEmbed[] | null };

const COMMENT_SELECT =
  'id, content, user_id, user_name, user_profile_image, created_at, author:users!user_id(profile_photo_url, nickname)';

/** Pure: project a comments row (with its joined author) onto the domain Comment. */
export function mapToComment(row: CommentRow): Comment {
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
 * 댓글 추가 (순수 데이터 mutation 함수)
 */
export async function createComment(
  _boardId: string,
  postId: string,
  content: string,
  userId: string,
  userName: string,
  userProfileImage: string,
) {
  const supabase = getSupabaseClient();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  throwOnError(await supabase.from('comments').insert({
    id,
    post_id: postId,
    user_id: userId,
    user_name: userName,
    user_profile_image: userProfileImage,
    content,
    count_of_replies: 0,
    created_at: createdAt,
  }));
}

/**
 * 댓글 수정 (순수 데이터 mutation 함수)
 */
export async function updateCommentToPost(
  _boardId: string,
  _postId: string,
  commentId: string,
  content: string,
) {
  const supabase = getSupabaseClient();
  throwOnError(await supabase.from('comments').update({ content }).eq('id', commentId));
}

/**
 * 댓글 삭제 (순수 데이터 mutation 함수)
 */
export async function deleteCommentToPost(_boardId: string, _postId: string, commentId: string) {
  const supabase = getSupabaseClient();
  throwOnError(await supabase.from('comments').delete().eq('id', commentId));
}

/**
 * 댓글 목록을 한 번만 가져오는 함수 (blockedByUsers 서버사이드 필터링 지원)
 */
export async function fetchCommentsOnce(
  _boardId: string,
  postId: string,
  blockedByUsers: string[] = [],
): Promise<Comment[]> {
  return fetchCommentsFromSupabase(postId, blockedByUsers);
}

/**
 * 댓글 단일 조회
 */
export async function fetchCommentById(
  _boardId: string,
  _postId: string,
  commentId: string,
): Promise<Comment | null> {
  return fetchCommentByIdFromSupabase(commentId);
}

/**
 * Fetch all comments for a post.
 * Uses index: idx_comments_post_created
 */
export async function fetchCommentsFromSupabase(
  postId: string,
  blockedByUsers: string[] = [],
): Promise<Comment[]> {
  const supabase = getSupabaseClient();

  let q = supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (blockedByUsers.length > 0) {
    q = q.not('user_id', 'in', formatInFilter(blockedByUsers));
  }

  const { data, error } = await q;

  if (error) throw error;
  return (data ?? []).map(mapToComment);
}

/**
 * Fetch a single comment by ID. Returns null only when the comment does not exist.
 */
export async function fetchCommentByIdFromSupabase(
  commentId: string,
): Promise<Comment | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('id', commentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no rows for this id
    throw error;
  }

  return mapToComment(data);
}
