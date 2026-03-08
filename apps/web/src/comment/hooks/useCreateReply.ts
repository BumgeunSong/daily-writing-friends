import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReply, updateReplyToComment, deleteReplyToComment } from '@/comment/api/reply';
import { useAuth } from '@/shared/hooks/useAuth';
import { useUser } from '@/user/hooks/useUser';

export function useCreateReply(boardId: string, postId: string, commentId: string) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { userData } = useUser(currentUser?.uid);

  return useMutation(
    async (content: string) => {
      if (!currentUser) throw new Error('로그인이 필요합니다.');
      return createReply(
        boardId,
        postId,
        commentId,
        content,
        currentUser.uid,
        userData?.nickname ?? currentUser.displayName,
        userData?.profilePhotoURL ?? currentUser.photoURL,
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['replies', boardId, postId, commentId] });
        queryClient.invalidateQueries({ queryKey: ['replyCount', boardId, postId, commentId] });
        if (currentUser) {
          queryClient.invalidateQueries({ queryKey: ['postProfileBadges', currentUser.uid] });
        }
      },
    },
  );
}

export function useEditReply(boardId: string, postId: string, commentId: string, replyId: string) {
  const queryClient = useQueryClient();
  return useMutation(
    (content: string) => updateReplyToComment(boardId, postId, commentId, replyId, content),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['replies', boardId, postId, commentId] });
        queryClient.invalidateQueries({ queryKey: ['replyCount', boardId, postId, commentId] });
      },
    },
  );
}

export function useDeleteReply(
  boardId: string,
  postId: string,
  commentId: string,
  replyId: string,
) {
  const queryClient = useQueryClient();
  return useMutation(() => deleteReplyToComment(boardId, postId, commentId, replyId), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['replies', boardId, postId, commentId] });
      queryClient.invalidateQueries({ queryKey: ['replyCount', boardId, postId, commentId] });
    },
  });
}
