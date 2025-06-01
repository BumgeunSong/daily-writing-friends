import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addCommentToPost } from '@/comment/api/comment';
import { useAuth } from '@/shared/hooks/useAuth';

export function useAddComment(boardId: string, postId: string) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  return useMutation(
    async (content: string) => {
      if (!currentUser) throw new Error('로그인이 필요합니다.');
      return addCommentToPost(
        boardId,
        postId,
        content,
        currentUser.uid,
        currentUser.displayName,
        currentUser.photoURL,
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['comments', boardId, postId] });
      },
    }
  );
} 