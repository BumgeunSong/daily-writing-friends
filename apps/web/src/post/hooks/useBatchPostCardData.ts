import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Post } from '@/post/model/Post';
import {
  buildPostCardDataMap,
  deduplicateAuthorIds,
  type PostCardPrefetchedData,
} from '@/post/utils/batchPostCardDataUtils';
import {
  fetchBatchUsersBasic,
  fetchBatchCommentUserIdsByDateRange,
  fetchBatchReplyUserIdsByDateRange,
  fetchBatchPostDatesByDateRange,
} from '@/shared/api/supabaseReads';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';
import { getDateRange } from '@/stats/api/stats';

export type { PostCardPrefetchedData } from '@/post/utils/batchPostCardDataUtils';
export { deduplicateAuthorIds, buildPostCardDataMap } from '@/post/utils/batchPostCardDataUtils';

export function useBatchPostCardData(posts: Post[]) {
  const authorIds = useMemo(
    () => deduplicateAuthorIds(posts),
    [posts],
  );
  const authorIdsKey = useMemo(
    () => [...authorIds].sort((a, b) => a.localeCompare(b)).join(','),
    [authorIds],
  );

  return useQuery({
    queryKey: ['batchPostCardData', authorIdsKey],
    queryFn: () => fetchBatchPostCardData(authorIds),
    enabled: authorIds.length > 0,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

async function fetchBatchPostCardData(
  authorIds: string[],
): Promise<Map<string, PostCardPrefetchedData>> {
  const workingDays5 = getRecentWorkingDays(5);
  const workingDays20 = getRecentWorkingDays(20);
  const badgeDateRange = getDateRange(workingDays20);
  const streakDateRange = getDateRange(workingDays5);

  const [users, commentRows, replyRows, postRows] = await Promise.all([
    fetchBatchUsersBasic(authorIds),
    fetchBatchCommentUserIdsByDateRange(authorIds, badgeDateRange.start, badgeDateRange.end),
    fetchBatchReplyUserIdsByDateRange(authorIds, badgeDateRange.start, badgeDateRange.end),
    fetchBatchPostDatesByDateRange(authorIds, streakDateRange.start, streakDateRange.end),
  ]);

  return buildPostCardDataMap(authorIds, users, commentRows, replyRows, postRows, workingDays5);
}
