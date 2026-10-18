import { useQueries, useQueryClient, type QueryClient } from '@tanstack/react-query';
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

const AUTHOR_DATA_QUERY_KEY_PREFIX = 'batchPostCardData';
const AUTHOR_DATA_STALE_TIME_MS = 5 * 60 * 1000;
const AUTHOR_DATA_CACHE_TIME_MS = 10 * 60 * 1000;

export function buildAuthorGroupQueryKey(authorIds: string[]) {
  const canonicalAuthorIds = [...authorIds].sort((a, b) => a.localeCompare(b)).join(',');
  return [AUTHOR_DATA_QUERY_KEY_PREFIX, canonicalAuthorIds];
}

function buildAuthorGroupQuery(authorIds: string[]) {
  return {
    queryKey: buildAuthorGroupQueryKey(authorIds),
    queryFn: () => fetchAuthorDataForGroup(authorIds),
    staleTime: AUTHOR_DATA_STALE_TIME_MS,
    cacheTime: AUTHOR_DATA_CACHE_TIME_MS,
    refetchOnWindowFocus: true,
  };
}

function toNonEmptyAuthorGroups(postPages: Post[][]): string[][] {
  return toDisjointAuthorIdGroups(postPages).filter((group) => group.length > 0);
}

/**
 * Mirrors each author's badges and streak into the keys the individual hooks
 * read, so PostDetailPage renders them without its own round-trip.
 */
function seedIndividualAuthorCaches(
  queryClient: QueryClient,
  prefetchedByAuthorId: Map<string, PostCardPrefetchedData>,
) {
  prefetchedByAuthorId.forEach((prefetched, authorId) => {
    queryClient.setQueryData(badgeQueryKey(authorId), prefetched.badges);
    queryClient.setQueryData(streakQueryKey(authorId), { streak: prefetched.streak });
  });
}

export function useBatchPostCardData(postPages: Post[][]) {
  const queryClient = useQueryClient();

  const authorGroups = useMemo(() => toNonEmptyAuthorGroups(postPages), [postPages]);
  const groupResults = useQueries({ queries: authorGroups.map(buildAuthorGroupQuery) });

  const resolvedRevision = groupResults.map((result) => result.dataUpdatedAt).join(',');
  const prefetchedByAuthorId = useMemo(
    () => mergeAuthorDataMaps(groupResults.map((result) => result.data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- useQueries returns a fresh array every render; dataUpdatedAt is the only change that alters the merged map
    [resolvedRevision],
  );

  useEffect(() => {
    seedIndividualAuthorCaches(queryClient, prefetchedByAuthorId);
  }, [prefetchedByAuthorId, queryClient]);

  return {
    data: prefetchedByAuthorId,
    isError: groupResults.some((result) => result.isError),
    isLoading: groupResults.some((result) => result.isLoading),
  };
}

async function fetchAuthorDataForGroup(
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
