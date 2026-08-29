import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';

import { fetchActiveDonatorIds } from '@/donator/external/donator.api';
import type { Post } from '@/post/model/Post';
import {
  buildPostCardDataMap,
  mergeAuthorDataMaps,
  toDisjointAuthorIdGroups,
  type PostCardPrefetchedData,
} from '@/post/utils/batchPostCardDataUtils';
import { fetchBatchUsersBasic } from '@/user/external/user.reads';
import { getRecentWorkingDays } from '@/shared/utils/dateUtils';
import {
  getDateRange,
  fetchBatchCommentUserIdsByDateRange,
  fetchBatchReplyUserIdsByDateRange,
  fetchBatchPostDatesByDateRange,
} from '@/stats/external/stats.api';
import {
  STREAK_WINDOW_WORKING_DAYS,
  TEMPERATURE_WINDOW_WORKING_DAYS,
} from '@/stats/constants';
import { badgeQueryKey, streakQueryKey } from '@/stats/utils/statsQueryKeys';

export type { PostCardPrefetchedData } from '@/post/utils/batchPostCardDataUtils';

const STALE_TIME_MS = 5 * 60 * 1000;
const CACHE_TIME_MS = 10 * 60 * 1000;

function buildAuthorGroupQueryKey(authorIds: string[]) {
  return ['batchPostCardData', [...authorIds].sort((a, b) => a.localeCompare(b)).join(',')];
}

/**
 * Prefetches author data for a list of post pages, one query per page.
 *
 * Takes pages rather than a flat list so each page's authors get their own
 * cache key: appending a page must not disturb what earlier pages already
 * resolved. See `toDisjointAuthorIdGroups`.
 */
export function useBatchPostCardData(postPages: Post[][]) {
  const queryClient = useQueryClient();

  const authorIdGroups = useMemo(
    () => toDisjointAuthorIdGroups(postPages).filter((group) => group.length > 0),
    [postPages],
  );

  const results = useQueries({
    queries: authorIdGroups.map((authorIds) => ({
      queryKey: buildAuthorGroupQueryKey(authorIds),
      queryFn: () => fetchBatchPostCardData(authorIds),
      staleTime: STALE_TIME_MS,
      cacheTime: CACHE_TIME_MS,
      refetchOnWindowFocus: true,
    })),
  });

  const dataVersion = results.map((result) => result.dataUpdatedAt).join(',');
  const data = useMemo(
    () => mergeAuthorDataMaps(results.map((result) => result.data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- useQueries returns a fresh array every render; dataUpdatedAt is the only change that alters the merged map
    [dataVersion],
  );

  // Seed individual query caches so PostDetailPage finds badges/streak
  // on first render without an extra network round-trip.
  // badges and streak shapes match their individual hook contracts exactly.
  useEffect(() => {
    data.forEach((prefetchedData, authorId) => {
      queryClient.setQueryData(badgeQueryKey(authorId), prefetchedData.badges);
      queryClient.setQueryData(streakQueryKey(authorId), { streak: prefetchedData.streak });
    });
  }, [data, queryClient]);

  return {
    data,
    isError: results.some((result) => result.isError),
    isLoading: results.some((result) => result.isLoading),
  };
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
