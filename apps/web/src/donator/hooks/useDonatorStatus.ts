import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveDonatorIds } from '../api/donator';
import { buildDonatorQueryIds } from '../utils/donatorQueryKeys';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

// TODO(perf): Each PostUserProfile renders calls useDonatorStatus independently. React
// Query dedupes identical queryKeys, but a feed of N unique authors still fires N parallel
// donator_status lookups on first load. Once we touch useBatchPostCardData again, hoist
// this lookup there and pass isDonator down via PostCardPrefetchedData.
export function useDonatorStatusBatch(userIds: string[]) {
  const stableIds = useMemo(() => buildDonatorQueryIds(userIds), [userIds]);

  const query = useQuery({
    queryKey: ['donator-status', stableIds],
    queryFn: () => fetchActiveDonatorIds(stableIds),
    staleTime: FIVE_MINUTES_MS,
    enabled: stableIds.length > 0,
  });

  const activeUserIds = useMemo(() => new Set(query.data ?? []), [query.data]);
  return { activeUserIds, isLoading: query.isLoading };
}

export function useDonatorStatus(userId: string | undefined) {
  const ids = useMemo(() => (userId ? [userId] : []), [userId]);
  const { activeUserIds, isLoading } = useDonatorStatusBatch(ids);
  return {
    isDonator: userId ? activeUserIds.has(userId) : false,
    isLoading,
  };
}
