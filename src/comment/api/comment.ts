import type { Comment } from '@/comment/model/Comment';
import { getSupabaseClient, throwOnError } from '@/shared/api/supabaseClient';
import { fetchCommentsFromSupabase, fetchCommentByIdFromSupabase } from '@/shared/api/supabaseReads';

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
