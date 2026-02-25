import * as Sentry from '@sentry/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { GetLikesParams } from '@/post/api/like';
import { createLike, deleteUserLike } from '@/post/api/like';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useUser } from '@/user/hooks/useUser';

interface UsePostLikesProps {
  boardId: string;
  postId: string;
}

interface UsePostLikesReturn {
  hasLiked: boolean;
  likeCount: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  toggleLike: () => Promise<void>;
}

export function usePostLikes({ boardId, postId }: UsePostLikesProps): UsePostLikesReturn {
  const { currentUser } = useAuth();
  const { userData } = useUser(currentUser?.uid);
  const queryClient = useQueryClient();

  const likesQueryKey = ['postLikes', boardId, postId];
  const postQueryKey = ['post', boardId, postId];

  // Fetch user's like status only
  const {
    data: likeData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: likesQueryKey,
    queryFn: async () => {
      if (!currentUser) {
        return { hasLiked: false };
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', currentUser.uid)
        .limit(1);

      if (error) throw error;

      return { hasLiked: !!data && data.length > 0 };
    },
    enabled: !!boardId && !!postId,
    onError: (error) => {
      console.error('좋아요 데이터를 불러오던 중 에러가 발생했습니다:', error);
      Sentry.captureException(error);
    },
  });

  const { hasLiked = false } = likeData || {};

  // Get like count from cached post data
  const postData = queryClient.getQueryData(postQueryKey) as { countOfLikes?: number } | undefined;
  const likeCount = postData?.countOfLikes ?? 0;

  // Create like mutation with optimistic update
  const createLikeMutation = useMutation(
    async () => {
      if (!currentUser) throw new Error('로그인이 필요합니다.');

      const likeUser = {
        userId: currentUser.uid,
        userName:
          userData?.nickname || userData?.realName || currentUser.displayName || '익명 사용자',
        userProfileImage: userData?.profilePhotoURL || currentUser.photoURL || '',
      };

      await createLike({ boardId, postId, likeUser });
    },
    {
      // Optimistic update
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: likesQueryKey });
        await queryClient.cancelQueries({ queryKey: postQueryKey });

        const previousLikeData = queryClient.getQueryData(likesQueryKey);
        const previousPostData = queryClient.getQueryData(postQueryKey);

        // Update like status
        queryClient.setQueryData(likesQueryKey, {
          hasLiked: true,
        });

        // Update post's like count
        if (previousPostData) {
          queryClient.setQueryData(postQueryKey, {
            ...previousPostData,
            countOfLikes: likeCount + 1,
          });
        }

        return { previousLikeData, previousPostData };
      },
      // Rollback on error
      onError: (error, _variables, context) => {
        console.error('좋아요 생성 중 에러가 발생했습니다:', error);
        Sentry.captureException(error);
        if (context?.previousLikeData) {
          queryClient.setQueryData(likesQueryKey, context.previousLikeData);
        }
        if (context?.previousPostData) {
          queryClient.setQueryData(postQueryKey, context.previousPostData);
        }
      },
      // Refetch on success
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: likesQueryKey });
        queryClient.invalidateQueries({ queryKey: postQueryKey });
      },
    },
  );

  // Delete like mutation with optimistic update
  const deleteLikeMutation = useMutation(
    async () => {
      if (!currentUser) throw new Error('로그인이 필요합니다.');
      const params: GetLikesParams = { boardId, postId };
      await deleteUserLike(params, currentUser.uid);
    },
    {
      // Optimistic update
      onMutate: async () => {
        await queryClient.cancelQueries({ queryKey: likesQueryKey });
        await queryClient.cancelQueries({ queryKey: postQueryKey });

        const previousLikeData = queryClient.getQueryData(likesQueryKey);
        const previousPostData = queryClient.getQueryData(postQueryKey);

        // Update like status
        queryClient.setQueryData(likesQueryKey, {
          hasLiked: false,
        });

        // Update post's like count
        if (previousPostData) {
          queryClient.setQueryData(postQueryKey, {
            ...previousPostData,
            countOfLikes: Math.max(0, likeCount - 1),
          });
        }

        return { previousLikeData, previousPostData };
      },
      // Rollback on error
      onError: (error, _variables, context) => {
        console.error('좋아요 삭제 중 에러가 발생했습니다:', error);
        Sentry.captureException(error);
        if (context?.previousLikeData) {
          queryClient.setQueryData(likesQueryKey, context.previousLikeData);
        }
        if (context?.previousPostData) {
          queryClient.setQueryData(postQueryKey, context.previousPostData);
        }
      },
      // Refetch on success
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: likesQueryKey });
        queryClient.invalidateQueries({ queryKey: postQueryKey });
      },
    },
  );

  const toggleLike = async () => {
    if (hasLiked) {
      await deleteLikeMutation.mutateAsync();
    } else {
      await createLikeMutation.mutateAsync();
    }
  };

  return {
    hasLiked,
    likeCount,
    isLoading,
    isError,
    error: error as Error | null,
    toggleLike,
  };
}
