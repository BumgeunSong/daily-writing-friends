import * as Sentry from '@sentry/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { createLike, deleteUserLike, GetLikesParams } from '@/post/api/like';
import { useAuth } from '@/shared/hooks/useAuth';
import { useUser } from '@/user/hooks/useUser';
import { firestore } from '@/firebase';

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

  // Fetch user's like status
  const {
    data: likeData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: likesQueryKey,
    queryFn: async () => {
      if (!currentUser) {
        return { hasLiked: false, likeCount: 0 };
      }

      const postRef = `boards/${boardId}/posts/${postId}`;
      const likesRef = collection(firestore, postRef, 'likes');

      // Get all likes for count
      const allLikesSnapshot = await getDocs(likesRef);
      const likeCount = allLikesSnapshot.size;

      // Check if current user has liked
      const userLikeQuery = query(likesRef, where('userId', '==', currentUser.uid));
      const userLikeSnapshot = await getDocs(userLikeQuery);
      const hasLiked = !userLikeSnapshot.empty;

      return { hasLiked, likeCount };
    },
    enabled: !!boardId && !!postId,
    onError: (error) => {
      console.error('좋아요 데이터를 불러오던 중 에러가 발생했습니다:', error);
      Sentry.captureException(error);
    },
  });

  const { hasLiked = false, likeCount = 0 } = likeData || {};

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

        const previousData = queryClient.getQueryData(likesQueryKey);

        queryClient.setQueryData(likesQueryKey, {
          hasLiked: true,
          likeCount: likeCount + 1,
        });

        return { previousData };
      },
      // Rollback on error
      onError: (error, _variables, context) => {
        console.error('좋아요 생성 중 에러가 발생했습니다:', error);
        Sentry.captureException(error);
        if (context?.previousData) {
          queryClient.setQueryData(likesQueryKey, context.previousData);
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

        const previousData = queryClient.getQueryData(likesQueryKey);

        queryClient.setQueryData(likesQueryKey, {
          hasLiked: false,
          likeCount: Math.max(0, likeCount - 1),
        });

        return { previousData };
      },
      // Rollback on error
      onError: (error, _variables, context) => {
        console.error('좋아요 삭제 중 에러가 발생했습니다:', error);
        Sentry.captureException(error);
        if (context?.previousData) {
          queryClient.setQueryData(likesQueryKey, context.previousData);
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
