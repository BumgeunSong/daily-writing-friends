import { getSupabaseClient, throwOnError } from '@/shared/api/supabaseClient';

export interface CreateLikeParams {
  boardId: string;
  postId: string;
  likeUser: {
    userId: string;
    userName: string;
    userProfileImage: string;
  };
}

export interface GetLikesParams {
  boardId: string;
  postId: string;
}

export async function createLike(params: CreateLikeParams): Promise<string> {
  const { likeUser, postId } = params;
  const supabase = getSupabaseClient();

  // Check if user already liked (prevent duplicates)
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', likeUser.userId)
    .limit(1);

  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  throwOnError(await supabase.from('likes').insert({
    id,
    post_id: postId,
    user_id: likeUser.userId,
    user_name: likeUser.userName,
    user_profile_image: likeUser.userProfileImage,
    created_at: createdAt,
  }));

  return id;
}

export async function deleteUserLike(params: GetLikesParams, userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  // Find and delete the like
  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', params.postId)
    .eq('user_id', userId)
    .limit(1);

  if (!data || data.length === 0) return;

  throwOnError(await supabase.from('likes').delete().eq('id', data[0].id));
}
