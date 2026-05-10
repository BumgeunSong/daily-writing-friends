import type { Reaction } from '@/comment/model/Reaction';
import type { UserSummary } from '@/shared/model/UserSummary';
import { getSupabaseClient, throwOnError } from '@/shared/api/supabaseClient';

// Shared base for all reaction param types
interface ReactionParamsBase {
  boardId: string;
  postId: string;
  commentId: string;
}

// --- GetReactionsParams (used by useReactions.getEntityParams) ---
export interface CommentReactionsParams extends ReactionParamsBase {
  replyId?: undefined;
}

export interface ReplyReactionsParams extends ReactionParamsBase {
  replyId: string;
}

export type GetReactionsParams = CommentReactionsParams | ReplyReactionsParams;

// --- CreateReactionParams ---
export interface CreateCommentReactionParams extends ReactionParamsBase {
  replyId?: undefined;
  content: string;
  reactionUser: UserSummary;
}

export interface CreateReplyReactionParams extends ReactionParamsBase {
  replyId: string;
  content: string;
  reactionUser: UserSummary;
}

export type CreateReactionParams = CreateCommentReactionParams | CreateReplyReactionParams;

// --- DeleteReactionParams ---
export interface DeleteCommentReactionParams extends ReactionParamsBase {
  replyId?: undefined;
  reactionId: string;
}

export interface DeleteReplyReactionParams extends ReactionParamsBase {
  replyId: string;
  reactionId: string;
}

export type DeleteReactionParams = DeleteCommentReactionParams | DeleteReplyReactionParams;

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
