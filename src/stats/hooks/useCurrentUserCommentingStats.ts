import { useQuery } from '@tanstack/react-query';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';
import { getDateRange } from '@/stats/api/stats';
import { createUserCommentingStats } from '@/stats/utils/commentingStatsUtils';
import { fetchUserCommentingsByDateRange, fetchUserReplyingsByDateRange } from '@/user/api/commenting';
import type { User } from '@/user/model/User';
import type { UserCommentingStats } from './useCommentingStats';

/**
 * Fetches commenting stats for current user only (prioritized loading)
 * @param currentUser - Current user object
 */
export function useCurrentUserCommentingStats(currentUser: User | null | undefined) {
  return useQuery({
    queryKey: ['currentUserCommentingStats', currentUser?.uid],
    queryFn: () => fetchCurrentUserCommentingStats(currentUser!),
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000,
    cacheTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

async function fetchCurrentUserCommentingStats(user: User): Promise<UserCommentingStats> {
  const workingDays = getRecentWorkingDays();
  const dateRange = getDateRange(workingDays);

  const [commentings, replyings] = await Promise.all([
    fetchUserCommentingsByDateRange(user.uid, dateRange.start, dateRange.end),
    fetchUserReplyingsByDateRange(user.uid, dateRange.start, dateRange.end),
  ]);

  return createUserCommentingStats(user, commentings, replyings, workingDays);
}
