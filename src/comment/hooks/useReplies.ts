import { useQuery } from '@tanstack/react-query';
import { getBlockedByUsers } from '@/user/api/user';
import { fetchRepliesOnce } from '@/comment/api/reply';
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