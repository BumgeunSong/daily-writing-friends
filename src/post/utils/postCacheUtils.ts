import { queryClient } from '@/shared/lib/queryClient';
import { isWorkingDay } from '@/shared/utils/dateUtils';

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
 *
 * Only updates if today is a working day (not weekend or holiday).
 * The streak array only contains working days, so updating on non-working days
 * would incorrectly mark a previous working day as having a post.
 */
export function optimisticallyUpdatePostingStreak(authorId: string) {
  const todayIsWorkingDay = isWorkingDay(new Date());
  if (!todayIsWorkingDay) {
    return;
  }

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
