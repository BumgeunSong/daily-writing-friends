import type { Reply } from '@/comment/model/Reply';
import { getSupabaseClient, throwOnError } from '@/shared/api/supabaseClient';
import {
  fetchRepliesFromSupabase,
  fetchReplyCountFromSupabase,
  fetchReplyByIdFromSupabase,
} from '@/shared/api/supabaseReads';

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
