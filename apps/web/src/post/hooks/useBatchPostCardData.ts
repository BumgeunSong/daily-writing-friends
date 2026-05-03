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
import {
  STREAK_WINDOW_WORKING_DAYS,
  TEMPERATURE_WINDOW_WORKING_DAYS,
} from '@/stats/constants';

export type { PostCardPrefetchedData } from '@/post/utils/batchPostCardDataUtils';

const STALE_TIME_MS = 5 * 60 * 1000;
const CACHE_TIME_MS = 10 * 60 * 1000;

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
    staleTime: STALE_TIME_MS,
    cacheTime: CACHE_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

async function fetchBatchPostCardData(
  authorIds: string[],
): Promise<Map<string, PostCardPrefetchedData>> {
  const streakWorkingDays = getRecentWorkingDays(STREAK_WINDOW_WORKING_DAYS);
  const temperatureWorkingDays = getRecentWorkingDays(TEMPERATURE_WINDOW_WORKING_DAYS);
  const temperatureDateRange = getDateRange(temperatureWorkingDays);
  const streakDateRange = getDateRange(streakWorkingDays);

  const [users, commentRows, replyRows, postRows] = await Promise.all([
    fetchBatchUsersBasic(authorIds),
    fetchBatchCommentUserIdsByDateRange(authorIds, temperatureDateRange.start, temperatureDateRange.end),
    fetchBatchReplyUserIdsByDateRange(authorIds, temperatureDateRange.start, temperatureDateRange.end),
    fetchBatchPostDatesByDateRange(authorIds, streakDateRange.start, streakDateRange.end),
  ]);

  return buildPostCardDataMap({
    authorIds,
    users,
    commentRows,
    replyRows,
    postRows,
    streakWorkingDays,
  });
}
