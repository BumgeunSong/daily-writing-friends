import { queryClient } from '@/shared/lib/queryClient';
import { isWorkingDay } from '@/shared/utils/dateUtils';

export function invalidatePostCaches(boardId: string, authorId: string) {
  queryClient.invalidateQueries({ queryKey: ['posts', boardId] });
  queryClient.invalidateQueries({ queryKey: ['userPostings', authorId] });
}

export function invalidateDraftCaches(authorId: string, draftId: string, boardId: string) {
  queryClient.removeQueries({
    queryKey: ['draft', authorId, draftId, boardId],
    exact: true,
  });
  queryClient.invalidateQueries({ queryKey: ['drafts', authorId] });
}

export function optimisticallyUpdatePostingStreak(authorId: string) {
  const todayIsWorkingDay = isWorkingDay(new Date());
  if (!todayIsWorkingDay) {
    return;
  }

  const postingStreakQueryKey = ['postingStreak', authorId];
  const cachedStreakData = queryClient.getQueryData<{ streak: boolean[] }>(postingStreakQueryKey);

  const hasValidStreakCache = cachedStreakData && cachedStreakData.streak.length > 0;

  if (hasValidStreakCache) {
    const streakWithTodayMarkedAsPosted = [...cachedStreakData.streak];
    const todayIndex = streakWithTodayMarkedAsPosted.length - 1;
    streakWithTodayMarkedAsPosted[todayIndex] = true;
    queryClient.setQueryData(postingStreakQueryKey, { streak: streakWithTodayMarkedAsPosted });
  } else if (!cachedStreakData) {
    queryClient.invalidateQueries({ queryKey: postingStreakQueryKey });
  }
}
