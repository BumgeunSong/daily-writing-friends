import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createComment, updateCommentToPost, deleteCommentToPost } from '@/comment/external/comment.api';
import { useAuth } from '@/shared/hooks/useAuth';
import type { ProseMirrorDoc } from '@/shared/model/ProseMirror';
import { badgeQueryKey } from '@/stats/utils/statsQueryKeys';
import { useUser } from '@/user/hooks/useUser';

interface CreateCommentInput {
  content: string;
  contentJson?: ProseMirrorDoc;
}

export function useCreateComment(boardId: string, postId: string) {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { userData } = useUser(currentUser?.uid);

  return useMutation(
    async ({ content, contentJson }: CreateCommentInput) => {
      if (!currentUser) throw new Error('로그인이 필요합니다.');
      return createComment(
        boardId,
        postId,
        content,
        currentUser.uid,
        userData?.nickname ?? currentUser.displayName ?? '',
        userData?.profilePhotoURL ?? currentUser.photoURL ?? '',
        contentJson,
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['comments', boardId, postId] });
        if (currentUser) {
          queryClient.invalidateQueries({ queryKey: badgeQueryKey(currentUser.uid) });
        }
      },
    },
  );
}

export function useEditComment(boardId: string, postId: string, commentId: string) {
  const queryClient = useQueryClient();
  return useMutation(
    (content: string) => updateCommentToPost(boardId, postId, commentId, content),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['comments', boardId, postId] });
      },
    },
  );
}

export function useDeleteComment(boardId: string, postId: string, commentId: string) {
  const queryClient = useQueryClient();
  return useMutation(() => deleteCommentToPost(boardId, postId, commentId), {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', boardId, postId] });
    },
  });
}
