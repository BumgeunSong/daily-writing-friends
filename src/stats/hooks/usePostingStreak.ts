import { useQuery } from '@tanstack/react-query';
import { fetchPostingDataForContributions } from '@/stats/api/stats';
import { getRecentWorkingDays, getDateKey } from '@/shared/utils/dateUtils';

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
  const workingDays = getRecentWorkingDays(5);
  const postings = await fetchPostingDataForContributions(userId, 5);

  const postingDates = new Set(postings.map((p) => getDateKey(p.createdAt.toDate())));
  const streak = workingDays.map((day) => postingDates.has(getDateKey(day)));

  return { streak };
}
