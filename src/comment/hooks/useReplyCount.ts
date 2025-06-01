import { useQuery } from '@tanstack/react-query';
import { fetchReplyCountOnce } from '@/comment/api/reply';
import { getBlockedByUsers } from '@/user/api/user';
import { useAuth } from '@/shared/hooks/useAuth';

export function useReplyCount(boardId: string, postId: string, commentId: string) {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const { data: replyCount = 0 } = useQuery<number>({
    queryKey: ['replyCount', boardId, postId, commentId],
    queryFn: async () => {
      const blockedByUsers = userId ? await getBlockedByUsers(userId) : [];
      return fetchReplyCountOnce(boardId, postId, commentId, blockedByUsers);
    },
    suspense: false,
    refetchOnWindowFocus: false,
  });
  return { replyCount };
} 