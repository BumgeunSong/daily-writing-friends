// TODO:
// 1. get posting data of certain user from firestore
// 2. calculate WritingStats from posting data
// 3. return stats

import { useQuery } from '@tanstack/react-query';
import { getRecentWorkingDays, getDateKey } from '@/shared/utils/dateUtils';
import { WritingStats, Contribution, WritingBadge } from '@/stats/model/WritingStats';
import {
  fetchPostingDataForContributions,
  createUserInfo,
  fetchUserSafely,
} from '@/stats/api/stats';
import { fetchStreakInfo } from '@/stats/api/streakInfo';
import { User } from '@/user/model/User';
import { Posting } from '@/post/model/Posting';

export function useWritingStats(userIds: string[], currentUserId?: string) {
  return useQuery({
    queryKey: ['writingStats-v2', userIds, currentUserId],
    queryFn: () => fetchMultipleUserStats(userIds, currentUserId),
    enabled: userIds.length > 0,
    // 캐시 설정
    staleTime: 1 * 60 * 1000, // 5분 동안 데이터를 'fresh'하게 유지
    cacheTime: 30 * 60 * 1000, // 30분 동안 캐시 유지
    // 실시간 업데이트를 위한 주기적 리프레시
    refetchInterval: 5 * 60 * 1000, // 5분마다 리프레시
    refetchOnWindowFocus: true, // 윈도우 포커스 시 리프레시
  });
}

async function fetchMultipleUserStats(
  userIds: string[],
  currentUserId?: string,
): Promise<WritingStats[]> {
  if (!userIds.length) return [];

  const statsPromises = userIds.map(fetchSingleUserStats);
  const results = await Promise.all(statsPromises);
  return sort(
    results.filter((result): result is WritingStats => result !== null),
    currentUserId,
  );
}

function sort(writingStats: WritingStats[], currentUserId?: string): WritingStats[] {
  return writingStats.sort((a, b) => {
    // Current user always comes first
    if (currentUserId) {
      if (a.user.id === currentUserId && b.user.id !== currentUserId) {
        return -1;
      }
      if (b.user.id === currentUserId && a.user.id !== currentUserId) {
        return 1;
      }
    }

    // Apply existing sorting logic for all other cases
    if (b.recentStreak !== a.recentStreak) {
      return b.recentStreak - a.recentStreak;
    }

    const aContentLengthSum = a.contributions.reduce(
      (sum, contribution) => sum + (contribution.contentLength ?? 0),
      0,
    );
    const bContentLengthSum = b.contributions.reduce(
      (sum, contribution) => sum + (contribution.contentLength ?? 0),
      0,
    );
    return bContentLengthSum - aContentLengthSum;
  });
}

async function fetchSingleUserStats(userId: string): Promise<WritingStats | null> {
  try {
    const userData = await fetchUserSafely(userId);
    if (!userData) return null;

    // Fetch data separately for different purposes
    const [contributionPostings, streakInfo] = await Promise.all([
      fetchPostingDataForContributions(userId, 20), // Only 20 days for contributions
      fetchStreakInfo(userId), // Server-side streak info
    ]);

    return calculateWritingStats(userData, contributionPostings, streakInfo?.currentStreak || 0);
  } catch (error) {
    return null;
  }
}

function createContributions(postings: Posting[], workingDays: Date[]): Contribution[] {
  const postingMap = new Map<string, number>();

  for (const posting of postings) {
    const postingDate = posting.createdAt.toDate();
    const key = getDateKey(postingDate);
    const currentSum = postingMap.get(key) || 0;
    postingMap.set(key, currentSum + posting.post.contentLength);
  }

  return workingDays.map((day) => ({
    createdAt: getDateKey(day),
    contentLength: postingMap.has(getDateKey(day)) ? postingMap.get(getDateKey(day))! : null,
  }));
}

function createStreakBadge(streak: number): WritingBadge[] {
  if (streak < 2) return [];

  return [
    {
      name: `연속 ${streak}일차`,
      emoji: '🔥',
    },
  ];
}

function calculateWritingStats(
  user: User,
  contributionPostings: Posting[],
  streak: number,
): WritingStats {
  const workingDays = getRecentWorkingDays(20); // Only 20 days for contributions
  const contributions = createContributions(contributionPostings, workingDays);
  const badges = createStreakBadge(streak);

  return {
    user: createUserInfo(user),
    contributions,
    badges,
    recentStreak: streak,
  };
}
