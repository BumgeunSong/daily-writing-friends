import { useQuery } from '@tanstack/react-query';
import { fetchReplyCountOnce } from '@/comment/api/reply';
import { useBlockedByUsers } from '@/user/hooks/useBlockedByUsers';

export function useReplyCount(boardId: string, postId: string, commentId: string) {
  const blockedByUsers = useBlockedByUsers();
  const { data: replyCount = 0 } = useQuery<number>({
    queryKey: ['replyCount', boardId, postId, commentId, blockedByUsers],
    queryFn: () => fetchReplyCountOnce(boardId, postId, commentId, blockedByUsers),
    suspense: false,
    refetchOnWindowFocus: false,
  });
  return { replyCount };
} 