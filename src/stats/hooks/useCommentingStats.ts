import { useQuery } from '@tanstack/react-query';
import { fetchUserCommentingsByDateRange, fetchUserReplyingsByDateRange } from '@/user/api/commenting';
import { fetchUser } from '@/user/api/user';
import { aggregateCommentingContributions, CommentingContribution } from '@/stats/utils/commentingContributionUtils';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';

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

async function fetchMultipleUserCommentingStats(userIds: string[], currentUserId?: string): Promise<UserCommentingStats[]> {
  if (!userIds.length) return [];
  const workingDays = getRecentWorkingDays();
  const start = workingDays[0];
  const end = new Date(workingDays[workingDays.length - 1]);
  end.setHours(23, 59, 59, 999); // 마지막 날의 끝까지 포함

  const statsPromises = userIds.map(async (userId) => {
    const [user, commentings, replyings] = await Promise.all([
      fetchUser(userId),
      fetchUserCommentingsByDateRange(userId, start, end),
      fetchUserReplyingsByDateRange(userId, start, end),
    ]);
    if (!user) return null;
    return {
      user: {
        id: user.uid,
        nickname: user.nickname || null,
        realname: user.realName || null,
        profilePhotoURL: user.profilePhotoURL || null,
        bio: user.bio || null,
      },
      contributions: aggregateCommentingContributions(commentings, replyings, workingDays),
    };
  });
  const results = await Promise.all(statsPromises);
  return sortCommentingStats(results.filter((r): r is UserCommentingStats => r !== null), currentUserId);
}

function sortCommentingStats(stats: UserCommentingStats[], currentUserId?: string): UserCommentingStats[] {
  return stats.sort((a, b) => {
    // Current user always comes first
    if (currentUserId) {
      if (a.user.id === currentUserId && b.user.id !== currentUserId) {
        return -1;
      }
      if (b.user.id === currentUserId && a.user.id !== currentUserId) {
        return 1;
      }
    }

    // Sort by total comment count (descending)
    const aTotal = a.contributions.reduce((sum, c) => sum + c.count, 0);
    const bTotal = b.contributions.reduce((sum, c) => sum + c.count, 0);
    return bTotal - aTotal;
  });
}

export function useCommentingStats(userIds: string[], currentUserId?: string) {
  return useQuery({
    queryKey: ['commentingStats', userIds, currentUserId],
    queryFn: () => fetchMultipleUserCommentingStats(userIds, currentUserId),
    enabled: userIds.length > 0,
    staleTime: 1 * 60 * 1000, // 1분
    cacheTime: 30 * 60 * 1000, // 30분
    refetchInterval: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: true,
  });
} 