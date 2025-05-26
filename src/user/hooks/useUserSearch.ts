import { useQuery } from '@tanstack/react-query';

/**
 * 유저 검색 커스텀 훅 (Suspense 지원)
 * @param search 검색어(닉네임 또는 이메일)
 * @param boardPermissions boardPermissions 맵 (향후 확장 대비, 현재는 전체 유저에서 검색)
 * @returns 검색 결과 유저 객체 또는 null
 */
export default function useUserSearch(
  search: string,
  boardPermissions: Record<string, string> | undefined
) {
  return useQuery({
    queryKey: ['userSearch', search, boardPermissions],
    queryFn: async () => {
      if (!search) return null;
      const { fetchAllUsers } = await import('@/user/api/user');
      const candidates = await fetchAllUsers();
      return candidates.find(u => u.nickname === search || u.email === search) || null;
    },
    enabled: !!search,
    suspense: true,
  });
} 