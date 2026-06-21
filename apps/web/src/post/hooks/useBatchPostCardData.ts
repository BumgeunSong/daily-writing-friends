import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';

import { fetchActiveDonatorIds } from '@/donator/api/donator';
import type { Post } from '@/post/model/Post';
import {
  buildPostCardDataMap,
  deduplicateAuthorIds,
  type PostCardPrefetchedData,
} from '@/post/utils/batchPostCardDataUtils';
import { fetchBatchUsersBasic } from '@/user/api/userReads';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';
import {
  getDateRange,
  fetchBatchCommentUserIdsByDateRange,
  fetchBatchReplyUserIdsByDateRange,
  fetchBatchPostDatesByDateRange,
} from '@/stats/api/stats';
import {
  STREAK_WINDOW_WORKING_DAYS,
  TEMPERATURE_WINDOW_WORKING_DAYS,
} from '@/stats/constants';

export type { PostCardPrefetchedData } from '@/post/utils/batchPostCardDataUtils';

const STALE_TIME_MS = 5 * 60 * 1000;
const CACHE_TIME_MS = 10 * 60 * 1000;

export function useBatchPostCardData(posts: Post[]) {
  const queryClient = useQueryClient();

  const authorIds = useMemo(
    () => deduplicateAuthorIds(posts),
    [posts],
  );
  const authorIdsKey = useMemo(
    () => [...authorIds].sort((a, b) => a.localeCompare(b)).join(','),
    [authorIds],
  );

  const query = useQuery({
    queryKey: ['batchPostCardData', authorIdsKey],
    queryFn: () => fetchBatchPostCardData(authorIds),
    enabled: authorIds.length > 0,
    staleTime: STALE_TIME_MS,
    cacheTime: CACHE_TIME_MS,
    refetchOnWindowFocus: true,
  });

  // Seed individual query caches so PostDetailPage finds badges/streak
  // on first render without an extra network round-trip.
  // badges and streak shapes match their individual hook contracts exactly.
  useEffect(() => {
    if (!query.data) return;
    query.data.forEach((prefetchedData, authorId) => {
      queryClient.setQueryData(['postProfileBadges', authorId], prefetchedData.badges);
      queryClient.setQueryData(['postingStreak', authorId], { streak: prefetchedData.streak });
    });
  }, [query.data, queryClient]);

  return query;
}

async function fetchBatchPostCardData(
  authorIds: string[],
): Promise<Map<string, PostCardPrefetchedData>> {
  const streakWorkingDays = getRecentWorkingDays(STREAK_WINDOW_WORKING_DAYS);
  const temperatureWorkingDays = getRecentWorkingDays(TEMPERATURE_WINDOW_WORKING_DAYS);
  const temperatureDateRange = getDateRange(temperatureWorkingDays);
  const streakDateRange = getDateRange(streakWorkingDays);

  const [users, commentRows, replyRows, postRows, donatorIdList] = await Promise.all([
    fetchBatchUsersBasic(authorIds),
    fetchBatchCommentUserIdsByDateRange(authorIds, temperatureDateRange.start, temperatureDateRange.end),
    fetchBatchReplyUserIdsByDateRange(authorIds, temperatureDateRange.start, temperatureDateRange.end),
    fetchBatchPostDatesByDateRange(authorIds, streakDateRange.start, streakDateRange.end),
    fetchActiveDonatorIds(authorIds),
  ]);

  return buildPostCardDataMap({
    authorIds,
    users,
    commentRows,
    replyRows,
    postRows,
    streakWorkingDays,
    donatorIds: new Set(donatorIdList),
  });
}
