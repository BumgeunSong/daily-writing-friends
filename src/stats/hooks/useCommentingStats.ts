import { useQuery } from '@tanstack/react-query';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';
import { getDateRange } from '@/stats/api/stats';
import { CommentingContribution } from '@/stats/utils/commentingContributionUtils';
import { createUserCommentingStats, sortCommentingStats } from '@/stats/utils/commentingStatsUtils';
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

    return createUserCommentingStats(user, commentings, replyings, workingDays);
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
  // Use sorted string of IDs for stable query key (avoids new array reference on every render)
  const userIdsKey = users.map(u => u.uid).sort().join(',');

  return useQuery({
    queryKey: ['commentingStats', userIdsKey, currentUserId],
    queryFn: () => fetchMultipleUserCommentingStats(users, currentUserId),
    enabled: users.length > 0,
    // Aggressive caching - stats don't need real-time updates
    staleTime: 5 * 60 * 1000, // 5분 동안 fresh 유지 (리페치 안함)
    cacheTime: 60 * 60 * 1000, // 1시간 동안 캐시 유지
    refetchOnWindowFocus: false, // 탭 포커스 시 리페치 안함
    refetchOnMount: false, // 컴포넌트 마운트 시 캐시 있으면 리페치 안함
  });
}
