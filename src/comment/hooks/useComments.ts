import { useQuery } from '@tanstack/react-query';
import { fetchCommentsOnce } from '@/comment/api/comment';
import type { Comment } from '@/comment/model/Comment';
import { useBlockedByUsers } from '@/user/hooks/useBlockedByUsers';

export function useComments(boardId: string, postId: string) {
  const blockedByUsers = useBlockedByUsers();
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['comments', boardId, postId, blockedByUsers],
    queryFn: () => fetchCommentsOnce(boardId, postId, blockedByUsers),
    suspense: true,
  });
  return { comments };
} 