import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Comment } from '@/comment/model/Comment';
import { groupReactionsByEmoji } from '@/comment/utils/reactionUtils';
import { fetchBatchReactionsForComments } from '@/shared/api/supabaseReads';

/**
 * Prefetches reactions for all comments in one batch query,
 * then seeds individual React Query cache entries so that
 * each useReactions() hook finds data already cached.
 */
export function usePrefetchCommentReactions(
  boardId: string,
  postId: string,
  comments: Comment[],
) {
  const queryClient = useQueryClient();
  const commentIds = useMemo(
    () => comments.map(c => c.id),
    [comments],
  );
  const commentIdsKey = useMemo(
    () => [...commentIds].sort().join(','),
    [commentIds],
  );

  return useQuery({
    queryKey: ['batchCommentReactions', boardId, postId, commentIdsKey],
    queryFn: async () => {
      const reactionsMap = await fetchBatchReactionsForComments(commentIds);

      // Seed individual cache entries matching useReactions query keys
      for (const [commentId, reactions] of reactionsMap) {
        const grouped = groupReactionsByEmoji(reactions);
        queryClient.setQueryData(
          ['reactions', boardId, postId, commentId, undefined],
          grouped,
        );
      }

      return reactionsMap;
    },
    enabled: commentIds.length > 0,
    staleTime: 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
