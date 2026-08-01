import { useQuery } from '@tanstack/react-query';
import { fetchReplyCountOnce } from '@/comment/external/reply';
import { useAuth } from '@/shared/hooks/useAuth';
import { getBlockedByUsers } from '@/user/external/user';

export function useReplyCount(boardId: string, postId: string, commentId: string) {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const { data: replyCount = 0 } = useQuery<number>({
    queryKey: ['replyCount', boardId, postId, commentId],
    queryFn: async () => {
      const blockedByUsers = userId ? await getBlockedByUsers(userId) : [];
      return fetchReplyCountOnce(boardId, postId, commentId, blockedByUsers);
    },
    enabled: !!currentUser,
    suspense: false,
    refetchOnWindowFocus: false,
  });
  return { replyCount };
} 