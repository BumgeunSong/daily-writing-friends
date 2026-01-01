import { queryClient } from '@/shared/lib/queryClient';

/**
 * Invalidate post-related caches after creating a post.
 */
export function invalidatePostCaches(boardId: string, authorId: string) {
  queryClient.invalidateQueries({ queryKey: ['posts', boardId] });
  queryClient.invalidateQueries({ queryKey: ['userPostings', authorId] });
}

/**
 * Invalidate draft-related caches after deleting a draft.
 */
export function invalidateDraftCaches(authorId: string, draftId: string, boardId: string) {
  queryClient.removeQueries({
    queryKey: ['draft', authorId, draftId, boardId],
    exact: true,
  });
  queryClient.invalidateQueries({ queryKey: ['drafts', authorId] });
}

/**
 * Optimistically update posting streak cache after creating a post.
 * Since the user just posted, today's streak should be true.
 */
export function optimisticallyUpdatePostingStreak(authorId: string) {
  const currentStreakData = queryClient.getQueryData<{ streak: boolean[] }>([
    'postingStreak',
    authorId,
  ]);
  if (currentStreakData) {
    const updatedStreak = [...currentStreakData.streak];
    updatedStreak[updatedStreak.length - 1] = true; // Today is the last element
    queryClient.setQueryData(['postingStreak', authorId], { streak: updatedStreak });
  } else {
    // If no cache exists, invalidate to trigger fresh fetch on next visit
    queryClient.invalidateQueries({ queryKey: ['postingStreak', authorId] });
  }
}
