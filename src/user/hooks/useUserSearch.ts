import { useQuery } from '@tanstack/react-query';

/**
 * 유저 검색 커스텀 훅 (Suspense 지원)
 * @param search 검색어(닉네임 또는 이메일)
 * @param boardPermissions boardPermissions 맵 (권한 있는 board 기준으로 검색 범위 제한)
 * @returns 검색 결과 유저 객체 또는 null
 */
export default function useUserSearch(
  search: string,
  boardPermissions: Record<string, string> | undefined
) {
  return useQuery({
    queryKey: ['userSearch', search, boardPermissions],
    queryFn: async () => {
      if (!search || !boardPermissions) return null;
      const { fetchUsersWithBoardPermission } = await import('@/user/api/user');
      const candidates = await fetchUsersWithBoardPermission(Object.keys(boardPermissions));
      return candidates.find(u => u.nickname === search || u.email === search) || null;
    },
    enabled: !!search && !!boardPermissions,
    suspense: true,
  });
} 