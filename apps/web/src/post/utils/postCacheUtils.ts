import type { QueryClient } from '@tanstack/react-query';
import type { Post } from '@/post/model/Post';
import { postQueryKey } from '@/post/utils/postQueryKeys';
import { queryClient } from '@/shared/lib/queryClient';
import { isWorkingDay } from '@/shared/utils/dateUtils';

/**
 * Seed the TanStack Query cache from a list page so PostDetailPage's
 * useQuery (and postDetailLoader's ensureQueryData) hits cache instantly.
 *
 * Skips the write when an entry already exists, so a fresher detail-page
 * fetch (e.g. updated countOfComments) is never regressed by older list data
 * within the 60s staleTime window.
 */
export function seedPostCache(client: QueryClient, post: Post): void {
  if (!post.content) return;
  const key = postQueryKey(post.boardId, post.id);
  if (client.getQueryData(key) !== undefined) return;
  client.setQueryData(key, post);
}

export function invalidatePostCaches(boardId: string, authorId: string) {
  queryClient.invalidateQueries({ queryKey: ['posts', boardId] });
  queryClient.invalidateQueries({ queryKey: ['bestPosts', boardId] });
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
