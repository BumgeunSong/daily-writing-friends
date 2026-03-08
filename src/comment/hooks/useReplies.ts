import { useQuery } from '@tanstack/react-query';
import { fetchRepliesOnce } from '@/comment/api/reply';
import type { Reply } from '@/comment/model/Reply';
import { useBlockedByUsers } from '@/user/hooks/useBlockedByUsers';

export function useReplies(boardId: string, postId: string, commentId: string) {
  const blockedByUsers = useBlockedByUsers();
  const { data: replies = [] } = useQuery<Reply[]>({
    queryKey: ['replies', boardId, postId, commentId, blockedByUsers.join(',')],
    queryFn: () => fetchRepliesOnce(boardId, postId, commentId, blockedByUsers),
    suspense: true,
  });

  return { replies };
}
