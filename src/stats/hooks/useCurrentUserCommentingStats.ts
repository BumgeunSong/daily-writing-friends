import { useQuery } from '@tanstack/react-query';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';
import { createUserInfo, getDateRange } from '@/stats/api/stats';
import { aggregateCommentingContributions } from '@/stats/utils/commentingContributionUtils';
import { fetchUserCommentingsByDateRange, fetchUserReplyingsByDateRange } from '@/user/api/commenting';
import { User } from '@/user/model/User';
import { UserCommentingStats } from './useCommentingStats';

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

  return {
    user: createUserInfo(user),
    contributions: aggregateCommentingContributions(commentings, replyings, workingDays),
  };
}
