import { useQuery } from '@tanstack/react-query';
import { fetchUserCommentings, fetchUserReplyings } from '@/user/api/commenting';
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

async function fetchMultipleUserCommentingStats(userIds: string[]): Promise<UserCommentingStats[]> {
  if (!userIds.length) return [];
  const workingDays = getRecentWorkingDays();

  const statsPromises = userIds.map(async (userId) => {
    const [user, commentings, replyings] = await Promise.all([
      fetchUser(userId),
      fetchUserCommentings(userId),
      fetchUserReplyings(userId),
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
  return results.filter((r): r is UserCommentingStats => r !== null);
}

export function useCommentingStats(userIds: string[]) {
  return useQuery({
    queryKey: ['commentingStats', userIds],
    queryFn: () => fetchMultipleUserCommentingStats(userIds),
    enabled: userIds.length > 0,
    staleTime: 1 * 60 * 1000, // 1분
    cacheTime: 30 * 60 * 1000, // 30분
    refetchInterval: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: true,
  });
} 