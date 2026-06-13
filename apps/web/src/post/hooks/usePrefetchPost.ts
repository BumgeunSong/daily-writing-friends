import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { postQueryKey } from '@/post/utils/postQueryKeys';
import { fetchPost } from '@/post/utils/postUtils';

/**
 * Eagerly prefetch a post into the TanStack Query cache so a subsequent
 * navigation to /board/:boardId/post/:postId hits a warm cache.
 *
 * Respects the 60s staleTime: repeat calls within the window are skipped,
 * which deduplicates prefetches across many list items pointing to the same post.
 */
export function usePrefetchPost(boardId: string, postId: string): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: postQueryKey(boardId, postId),
      queryFn: () => fetchPost(boardId, postId),
    });
  }, [queryClient, boardId, postId]);
}
