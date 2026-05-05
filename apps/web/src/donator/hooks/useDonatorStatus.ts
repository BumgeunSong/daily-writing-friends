import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDonatorStatusBatch } from '../api/donator';
import { isDonatorActive } from '../model/DonatorStatus';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

function dedupeAndSort(userIds: string[]): string[] {
  return [...new Set(userIds)].sort();
}

export function useDonatorStatusBatch(userIds: string[]) {
  const stableIds = useMemo(() => dedupeAndSort(userIds), [userIds]);

  const query = useQuery({
    queryKey: ['donator-status', stableIds],
    queryFn: () => fetchDonatorStatusBatch(stableIds),
    staleTime: FIVE_MINUTES_MS,
    enabled: stableIds.length > 0,
  });

  const activeUserIds = useMemo(() => {
    const now = new Date();
    const active = new Set<string>();
    for (const status of query.data ?? []) {
      if (isDonatorActive(status.activeUntil, now)) active.add(status.userId);
    }
    return active;
  }, [query.data]);

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
