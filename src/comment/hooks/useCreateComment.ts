import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createComment, updateCommentToPost, deleteCommentToPost } from '@/comment/api/comment';
import { useAuth } from '@/shared/hooks/useAuth';
import { useUser } from '@/user/hooks/useUser';

export function useCreateComment(boardId: string, postId: string) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { userData } = useUser(currentUser?.uid);

  return useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser) throw new Error('로그인이 필요합니다.');
      return createComment(
        boardId,
        postId,
        content,
        currentUser.uid,
        userData?.nickname ?? currentUser.displayName,
        userData?.profilePhotoURL ?? currentUser.photoURL,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', boardId, postId] });
    },
  });
}

export function useEditComment(boardId: string, postId: string, commentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => updateCommentToPost(boardId, postId, commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', boardId, postId] });
    },
  });
}

export function useDeleteComment(boardId: string, postId: string, commentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteCommentToPost(boardId, postId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', boardId, postId] });
    },
  });
}
