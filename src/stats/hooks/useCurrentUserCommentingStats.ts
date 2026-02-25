import { useQuery } from '@tanstack/react-query';
import { getDateKey, getRecentWorkingDays } from '@/shared/utils/dateUtils';
import { getDateRange } from '@/stats/api/stats';
import { createUserInfo } from '@/stats/utils/userInfoUtils';
import {
  fetchBatchCommentCountsByDateRange,
  fetchBatchReplyCountsByDateRange,
} from '@/shared/api/supabaseReads';
import type { User } from '@/user/model/User';
import type { CommentingContribution } from '@/stats/utils/commentingContributionUtils';
import type { UserCommentingStats } from './useCommentingStats';

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

  // 2 queries without JOINs (only need user_id + created_at for counting)
  const [commentRows, replyRows] = await Promise.all([
    fetchBatchCommentCountsByDateRange([user.uid], dateRange.start, dateRange.end),
    fetchBatchReplyCountsByDateRange([user.uid], dateRange.start, dateRange.end),
  ]);

  // Count per day
  const dayCounts = new Map<string, number>();
  for (const row of [...commentRows, ...replyRows]) {
    const dayKey = getDateKey(new Date(row.created_at));
    dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
  }

  const contributions: CommentingContribution[] = workingDays.map(day => {
    const key = getDateKey(day);
    const count = dayCounts.get(key);
    return {
      createdAt: key,
      countOfCommentAndReplies: count != null && count > 0 ? count : null,
    };
  });

  return { user: createUserInfo(user), contributions };
}
