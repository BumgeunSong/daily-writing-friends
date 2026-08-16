import { useQuery } from '@tanstack/react-query';
import { fetchRepliesOnce } from '@/comment/external/reply.api';
import type { Reply } from '@/comment/model/Reply';
import { useAuth } from '@/shared/hooks/useAuth';
import { useBlockedByUsers } from '@/user/hooks/useBlockedByUsers';

export function useReplies(boardId: string, postId: string, commentId: string) {
  const { currentUser } = useAuth();
  const { data: blockedByUsers = [] } = useBlockedByUsers(currentUser?.uid);

  // blockedByUsers comes from a shared cache, not an await inside queryFn, so the
  // content fetch skips one serial RTT; keepPreviousData avoids a suspense-fallback
  // flash when a non-empty list resolves and changes the queryKey.
  const { data: replies = [] } = useQuery<Reply[]>({
    queryKey: ['replies', boardId, postId, commentId, blockedByUsers],
    queryFn: () => fetchRepliesOnce(boardId, postId, commentId, blockedByUsers),
    suspense: true,
    keepPreviousData: true,
  });

  return { replies };
}
