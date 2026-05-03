import { useQuery } from '@tanstack/react-query';
import { getRecentWorkingDays, getDateKey } from '@/shared/utils/dateUtils';
import { fetchPostingDataForContributions } from '@/stats/api/stats';
import { STREAK_WINDOW_WORKING_DAYS } from '@/stats/constants';

export interface PostingStreakData {
  streak: boolean[];
}

export function usePostingStreak(userId: string) {
  return useQuery({
    queryKey: ['postingStreak', userId],
    queryFn: () => fetchPostingStreak(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
}

async function fetchPostingStreak(userId: string): Promise<PostingStreakData> {
  const workingDays = getRecentWorkingDays(STREAK_WINDOW_WORKING_DAYS);
  const postings = await fetchPostingDataForContributions(userId, STREAK_WINDOW_WORKING_DAYS);

  const postingDates = new Set(postings.map((p) => getDateKey(p.createdAt)));
  const streak = workingDays.map((day) => postingDates.has(getDateKey(day)));

  return { streak };
}
