import { useQuery } from '@tanstack/react-query';

import { fetchUsersWithBoardPermission } from '@/user/external/user.api';
import type { User } from '@/user/model/User';

export function useBoardMembers(boardId: string) {
  return useQuery({
    queryKey: ['boardMembers', boardId],
    queryFn: () => fetchUsersWithBoardPermission([boardId]),
    staleTime: 1000 * 60 * 10,
    enabled: !!boardId,
  });
}

/**
 * Functional core: filter board members by a mention query and rank them.
 * Thread participants sort first, then Korean-collated by nickname.
 */
export function filterAndRankCandidates(
  members: User[],
  query: string,
  participantIds: Set<string>,
): User[] {
  const q = query.trim().toLowerCase();
  const matched = q
    ? members.filter(
        (m) =>
          (m.nickname?.toLowerCase() ?? '').includes(q) ||
          (m.email?.toLowerCase() ?? '').includes(q),
      )
    : members;
  return [...matched].sort((a, b) => {
    const ap = participantIds.has(a.uid) ? 0 : 1;
    const bp = participantIds.has(b.uid) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return (a.nickname ?? '').localeCompare(b.nickname ?? '', 'ko');
  });
}
