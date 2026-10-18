import { useQuery } from '@tanstack/react-query';
import { fetchReplyCountOnce } from '@/comment/external/reply.api';
import { useAuth } from '@/shared/hooks/useAuth';
import { useBlockedByUsers } from '@/user/hooks/useBlockedByUsers';

export function useReplyCount(boardId: string, postId: string, commentId: string) {
  const { currentUser } = useAuth();
  const { data: blockedByUsers = [] } = useBlockedByUsers(currentUser?.uid);

  // blockedByUsers comes from a shared cache, not an await inside queryFn, so the
  // count fetch skips one serial RTT; keepPreviousData avoids a flash back to 0
  // when a non-empty list resolves and changes the queryKey.
  const { data: replyCount = 0 } = useQuery<number>({
    queryKey: ['replyCount', boardId, postId, commentId, blockedByUsers],
    queryFn: () => fetchReplyCountOnce(boardId, postId, commentId, blockedByUsers),
    enabled: !!currentUser,
    suspense: false,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });
  return { replyCount };
} 