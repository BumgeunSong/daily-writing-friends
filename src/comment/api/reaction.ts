import { Reaction } from '@/comment/model/Reaction';
import { getSupabaseClient, throwOnError } from '@/shared/api/supabaseClient';
import { fetchReactionsFromSupabase } from '@/shared/api/supabaseReads';

export interface CreateReactionParams {
  boardId: string;
  postId: string;
  commentId: string;
  replyId?: string;
  content: string;
  reactionUser: {
    userId: string;
    userName: string;
    userProfileImage: string;
  };
}

export interface DeleteReactionParams {
  boardId: string;
  postId: string;
  commentId: string;
  replyId?: string;
  reactionId: string;
}

export interface GetReactionsParams {
  boardId: string;
  postId: string;
  commentId: string;
  replyId?: string;
}

export async function createReaction(params: CreateReactionParams): Promise<string> {
  const { content, reactionUser, commentId, replyId } = params;
  const supabase = getSupabaseClient();

  // Check for existing reaction (prevent duplicates)
  let existingQuery = supabase
    .from('reactions')
    .select('id')
    .eq('reaction_type', content)
    .eq('user_id', reactionUser.userId);

  if (replyId) {
    existingQuery = existingQuery.eq('reply_id', replyId);
  } else {
    existingQuery = existingQuery.eq('comment_id', commentId);
  }

  const { data: existing } = await existingQuery.limit(1);
  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  throwOnError(await supabase.from('reactions').insert({
    id,
    comment_id: replyId ? null : commentId,
    reply_id: replyId || null,
    user_id: reactionUser.userId,
    user_name: reactionUser.userName,
    user_profile_image: reactionUser.userProfileImage,
    reaction_type: content,
    created_at: createdAt,
  }));

  return id;
}

export async function deleteReaction(params: DeleteReactionParams): Promise<void> {
  const { reactionId } = params;
  const supabase = getSupabaseClient();
  throwOnError(await supabase.from('reactions').delete().eq('id', reactionId));
}

export async function deleteUserReaction(
  params: GetReactionsParams,
  userId: string,
  content: string
): Promise<void> {
  const supabase = getSupabaseClient();

  let q = supabase
    .from('reactions')
    .select('id')
    .eq('user_id', userId)
    .eq('reaction_type', content);

  if (params.replyId) {
    q = q.eq('reply_id', params.replyId);
  } else {
    q = q.eq('comment_id', params.commentId);
  }

  const { data } = await q.limit(1);
  if (!data || data.length === 0) return;

  throwOnError(await supabase.from('reactions').delete().eq('id', data[0].id));
}

export async function getReactions(params: GetReactionsParams): Promise<Reaction[]> {
  return fetchReactionsFromSupabase({
    commentId: params.commentId,
    replyId: params.replyId,
  });
}
