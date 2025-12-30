import { useQuery } from '@tanstack/react-query';
import { Posting } from '@/post/model/Posting';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';
import { fetchPostingDataForContributions, createUserInfo } from '@/stats/api/stats';
import { WritingStats } from '@/stats/model/WritingStats';
import { createContributions } from '@/stats/utils/writingStatsUtils';
import { User } from '@/user/model/User';

/**
 * Fetches writing stats for current user only (prioritized loading)
 * @param currentUser - Current user object
 */
export function useCurrentUserWritingStats(currentUser: User | null | undefined) {
  return useQuery({
    queryKey: ['currentUserWritingStats', currentUser?.uid],
    queryFn: () => fetchCurrentUserStats(currentUser!),
    enabled: !!currentUser,
    // Same caching strategy as useWritingStats
    staleTime: 5 * 60 * 1000,
    cacheTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

async function fetchCurrentUserStats(user: User): Promise<WritingStats> {
  const contributionPostings = await fetchPostingDataForContributions(user.uid, 20);
  return calculateWritingStats(user, contributionPostings);
}

function calculateWritingStats(user: User, contributionPostings: Posting[]): WritingStats {
  const workingDays = getRecentWorkingDays(20);
  const contributions = createContributions(contributionPostings, workingDays);

  return {
    user: createUserInfo(user),
    contributions,
    badges: [],
    recentStreak: 0,
  };
}
