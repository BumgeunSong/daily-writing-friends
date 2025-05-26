import { useQuery } from '@tanstack/react-query';

/**
 * 전체 유저 목록을 suspense + 장기 캐시로 가져오는 훅
 */
export function useAllUsers() {
  return useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      const { fetchAllUsers } = await import('@/user/api/user');
      return fetchAllUsers();
    },
    suspense: true,
    staleTime: 1000 * 60 * 10, // 10분 캐시
    cacheTime: 1000 * 60 * 30, // 30분 메모리 보관
  });
}

/**
 * 유저 검색 커스텀 훅 (Suspense 지원)
 * @param search 검색어(닉네임 또는 이메일)
 * @param boardPermissions boardPermissions 맵 (향후 확장 대비, 현재는 전체 유저에서 검색)
 * @returns 검색 결과 유저 객체 배열
 */
export default function useUserSearch(
  search: string,
  boardPermissions: Record<string, string> | undefined
) {
  // 전체 유저 데이터는 캐시에서 가져옴
  const { data: candidates = [] } = useAllUsers();
  return useQuery({
    queryKey: ['userSearch', search, boardPermissions],
    queryFn: async () => {
      if (!search) return [];
      const lower = search.toLowerCase();
      return candidates.filter(
        u =>
          (u.nickname?.toLowerCase() ?? '').includes(lower) ||
          (u.email?.toLowerCase() ?? '').includes(lower)
      )
    },
    enabled: !!search,
    suspense: true,
  });
} 