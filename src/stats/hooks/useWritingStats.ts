import { useQuery } from '@tanstack/react-query';
import { Posting } from '@/post/model/Posting';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';
import {
  fetchPostingDataForContributions,
  createUserInfo,
} from '@/stats/api/stats';
import { WritingStats } from '@/stats/model/WritingStats';
import {
  sortWritingStats,
  createContributions,
} from '@/stats/utils/writingStatsUtils';
import { User } from '@/user/model/User';

/**
 * Fetches writing stats for multiple users
 * @param users - User objects (already fetched by useUserInBoard)
 * @param currentUserId - Current user ID for sorting
 */
export function useWritingStats(users: User[], currentUserId?: string) {
  return useQuery({
    queryKey: ['writingStats-v2', users.map(u => u.uid), currentUserId],
    queryFn: () => fetchMultipleUserStats(users, currentUserId),
    enabled: users.length > 0,
    // Aggressive caching - stats don't need real-time updates
    staleTime: 5 * 60 * 1000, // 5분 동안 fresh 유지 (리페치 안함)
    cacheTime: 60 * 60 * 1000, // 1시간 동안 캐시 유지
    refetchOnWindowFocus: false, // 탭 포커스 시 리페치 안함
    refetchOnMount: false, // 컴포넌트 마운트 시 캐시 있으면 리페치 안함
  });
}

async function fetchMultipleUserStats(
  users: User[],
  currentUserId?: string,
): Promise<WritingStats[]> {
  if (!users.length) return [];

  const statsPromises = users.map(fetchSingleUserStats);
  const results = await Promise.all(statsPromises);
  return sortWritingStats(
    results.filter((result): result is WritingStats => result !== null),
    currentUserId,
  );
}

async function fetchSingleUserStats(user: User): Promise<WritingStats | null> {
  try {
    const contributionPostings = await fetchPostingDataForContributions(user.uid, 20);
    return calculateWritingStats(user, contributionPostings);
  } catch (error) {
    return null;
  }
}

function calculateWritingStats(
  user: User,
  contributionPostings: Posting[],
): WritingStats {
  const workingDays = getRecentWorkingDays(20);
  const contributions = createContributions(contributionPostings, workingDays);

  return {
    user: createUserInfo(user),
    contributions,
    badges: [],
    recentStreak: 0,
  };
}
