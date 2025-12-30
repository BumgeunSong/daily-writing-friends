import { useQuery } from '@tanstack/react-query';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';
import { createUserInfo, getDateRange } from '@/stats/api/stats';
import { aggregateCommentingContributions, CommentingContribution } from '@/stats/utils/commentingContributionUtils';
import { sortCommentingStats } from '@/stats/utils/commentingStatsUtils';
import { fetchUserCommentingsByDateRange, fetchUserReplyingsByDateRange } from '@/user/api/commenting';
import { User } from '@/user/model/User';

export type UserCommentingStats = {
  user: {
    id: string;
    nickname: string | null;
    realname: string | null;
    profilePhotoURL: string | null;
    bio: string | null;
  };
  contributions: CommentingContribution[];
};

async function fetchMultipleUserCommentingStats(users: User[], currentUserId?: string): Promise<UserCommentingStats[]> {
  if (!users.length) return [];

  const workingDays = getRecentWorkingDays();
  const dateRange = getDateRange(workingDays);

  const statsPromises = users.map(user => fetchSingleUserCommentingStats(user, dateRange, workingDays));
  const results = await Promise.all(statsPromises);

  return sortCommentingStats(results.filter((r): r is UserCommentingStats => r !== null), currentUserId);
}

async function fetchSingleUserCommentingStats(
  user: User,
  dateRange: { start: Date; end: Date },
  workingDays: Date[]
): Promise<UserCommentingStats | null> {
  try {
    const [commentings, replyings] = await Promise.all([
      fetchUserCommentingsByDateRange(user.uid, dateRange.start, dateRange.end),
      fetchUserReplyingsByDateRange(user.uid, dateRange.start, dateRange.end),
    ]);

    return {
      user: createUserInfo(user),
      contributions: aggregateCommentingContributions(commentings, replyings, workingDays),
    };
  } catch (error) {
    console.error('Error fetching user commenting stats:', error);
    return null;
  }
}

/**
 * Fetches commenting stats for multiple users
 * @param users - User objects (already fetched by useUserInBoard)
 * @param currentUserId - Current user ID for sorting
 */
export function useCommentingStats(users: User[], currentUserId?: string) {
  return useQuery({
    queryKey: ['commentingStats', users.map(u => u.uid), currentUserId],
    queryFn: () => fetchMultipleUserCommentingStats(users, currentUserId),
    enabled: users.length > 0,
    staleTime: 1 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
