// TODO:
// 1. get posting data of certain user from firestore
// 2. calculate WritingStats from posting data
// 3. return stats

import { useQuery } from '@tanstack/react-query';
import { Posting } from '@/post/model/Posting';
import { getRecentWorkingDays, getDateKey } from '@/shared/utils/dateUtils';
import {
  fetchPostingDataForContributions,
  createUserInfo,
  fetchUserSafely,
} from '@/stats/api/stats';
import { WritingStats, Contribution } from '@/stats/model/WritingStats';
import { User } from '@/user/model/User';

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

    // Sort by total content length only
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

    const contributionPostings = await fetchPostingDataForContributions(userId, 20);

    return calculateWritingStats(userData, contributionPostings);
  } catch (error) {
    return null;
  }
}

// --- Contribution 생성 로직 분해 ---
function accumulatePostingLengths(postings: Posting[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const posting of postings) {
    const key = getDateKey(posting.createdAt.toDate());
    const currentSum = map.get(key) || 0;
    map.set(key, currentSum + posting.post.contentLength);
  }
  return map;
}

function toContribution(
  key: string,
  lengthMap: Map<string, number>,
): Contribution {
  const contentLength = lengthMap.has(key) ? lengthMap.get(key)! : null;
  return { createdAt: key, contentLength };
}

function createContributions(
  postings: Posting[],
  workingDays: Date[],
): Contribution[] {
  const lengthMap = accumulatePostingLengths(postings);
  return workingDays.map((day) => toContribution(getDateKey(day), lengthMap));
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
