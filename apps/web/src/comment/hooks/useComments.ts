import { useQuery } from '@tanstack/react-query';
import { fetchCommentsOnce } from '@/comment/external/comment.api';
import type { Comment } from '@/comment/model/Comment';
import { useAuth } from '@/shared/hooks/useAuth';
import { useBlockedByUsers } from '@/user/hooks/useBlockedByUsers';

export function useComments(boardId: string, postId: string) {
  const { currentUser } = useAuth();
  const { data: blockedByUsers = [] } = useBlockedByUsers(currentUser?.uid);

  // blockedByUsers comes from a shared cache, not an await inside queryFn, so the
  // content fetch skips one serial RTT; keepPreviousData avoids a suspense-fallback
  // flash when a non-empty list resolves and changes the queryKey.
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['comments', boardId, postId, blockedByUsers],
    queryFn: () => fetchCommentsOnce(boardId, postId, blockedByUsers),
    suspense: true,
    keepPreviousData: true,
  });
  return { comments };
} 