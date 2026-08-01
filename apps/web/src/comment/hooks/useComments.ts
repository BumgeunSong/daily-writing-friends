import { useQuery } from '@tanstack/react-query';
import { fetchCommentsOnce } from '@/comment/external/comment';
import type { Comment } from '@/comment/model/Comment';
import { useAuth } from '@/shared/hooks/useAuth';
import { getBlockedByUsers } from '@/user/external/user';

export function useComments(boardId: string, postId: string) {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['comments', boardId, postId, userId],
    queryFn: async () => {
      const blockedByUsers = userId ? await getBlockedByUsers(userId) : [];
      return fetchCommentsOnce(boardId, postId, blockedByUsers);
    },
    suspense: true,
  });
  return { comments };
} 