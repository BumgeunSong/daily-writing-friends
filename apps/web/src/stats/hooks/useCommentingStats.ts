import { useQuery } from '@tanstack/react-query';
import { getDateKey, getRecentWorkingDays } from '@/shared/utils/dateUtils';
import { getDateRange } from '@/stats/api/stats';
import type { CommentingContribution } from '@/stats/utils/commentingContributionUtils';
import { sortCommentingStats } from '@/stats/utils/commentingStatsUtils';
import { createUserInfo } from '@/stats/utils/userInfoUtils';
import {
  fetchBatchCommentCountsByDateRange,
  fetchBatchReplyCountsByDateRange,
} from '@/shared/api/supabaseReads';
import type { User } from '@/user/model/User';

export interface UserCommentingStats {
  user: {
    id: string;
    nickname: string | null;
    realname: string | null;
    profilePhotoURL: string | null;
    bio: string | null;
  };
  contributions: CommentingContribution[];
}

async function fetchMultipleUserCommentingStats(users: User[], currentUserId?: string): Promise<UserCommentingStats[]> {
  if (!users.length) return [];

  const workingDays = getRecentWorkingDays();
  const dateRange = getDateRange(workingDays);
  const userIds = users.map(u => u.uid);

  // 2 batch queries instead of 2N per-user queries
  const [commentRows, replyRows] = await Promise.all([
    fetchBatchCommentCountsByDateRange(userIds, dateRange.start, dateRange.end),
    fetchBatchReplyCountsByDateRange(userIds, dateRange.start, dateRange.end),
  ]);

  // Build Map<userId, Map<dayKey, count>>
  const countMap = new Map<string, Map<string, number>>();
  for (const row of [...commentRows, ...replyRows]) {
    if (!countMap.has(row.user_id)) countMap.set(row.user_id, new Map());
    const userMap = countMap.get(row.user_id)!;
    const dayKey = getDateKey(new Date(row.created_at));
    userMap.set(dayKey, (userMap.get(dayKey) ?? 0) + 1);
  }

  // Build UserCommentingStats[] preserving null semantics
  const results: UserCommentingStats[] = users.map(user => {
    const userDayCounts = countMap.get(user.uid);
    const contributions: CommentingContribution[] = workingDays.map(day => {
      const key = getDateKey(day);
      const count = userDayCounts?.get(key);
      return {
        createdAt: key,
        countOfCommentAndReplies: count != null && count > 0 ? count : null,
      };
    });
    return { user: createUserInfo(user), contributions };
  });

  return sortCommentingStats(results, currentUserId);
}

/**
 * Fetches commenting stats for multiple users
 * @param users - User objects (already fetched by useUserInBoard)
 * @param currentUserId - Current user ID for sorting
 */
export function useCommentingStats(users: User[], currentUserId?: string) {
  // Use sorted string of IDs for stable query key (avoids new array reference on every render)
  const userIdsKey = users.map(u => u.uid).sort((a, b) => a.localeCompare(b)).join(',');

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
