import type { Comment } from '@/comment/model/Comment';
import { getSupabaseClient, throwOnError } from '@/shared/api/supabaseClient';
import { formatInFilter } from '@/shared/api/supabaseReads';
import { createTimestamp } from '@/shared/model/Timestamp';

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
    createdAt: createTimestamp(new Date(row.created_at)),
  };
}
