import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBlockedByUsers } from '@/user/api/user';
import { fetchRepliesOnce } from '@/comment/api/reply';
import { addReplyToComment } from '@/comment/utils/commentUtils';
import { Reply } from '@/comment/model/Reply';
import { useAuth } from '@/shared/hooks/useAuth';

export function useReplies(boardId: string, postId: string, commentId: string) {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const { data: replies = [] } = useQuery<Reply[]>({
    queryKey: ['replies', boardId, postId, commentId, userId],
    queryFn: async () => {
      const blockedByUsers = userId ? await getBlockedByUsers(userId) : [];
      return fetchRepliesOnce(boardId, postId, commentId, blockedByUsers);
    },
    suspense: true,
  });

  return { replies };
}

export function useAddReply(boardId: string, postId: string, commentId: string) {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const queryClient = useQueryClient();

  return useMutation(
    async (content: string) => {
      if (!currentUser) throw new Error('로그인이 필요합니다.');
      return addReplyToComment(
        boardId,
        postId,
        commentId,
        content,
        currentUser.uid,
        currentUser.displayName,
        currentUser.photoURL,
      );
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['replies', boardId, postId, commentId, userId] });
        queryClient.invalidateQueries({ queryKey: ['replyCount', boardId, postId, commentId, userId] });
      },
    }
  );
} 