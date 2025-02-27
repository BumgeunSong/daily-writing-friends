import { useQuery } from '@tanstack/react-query';
import { getDrafts } from '@/utils/draftUtils';
import { Draft } from '@/types/Draft';

interface UseDraftsResult {
  drafts: Draft[] | undefined;
  isLoading: boolean;
  refetch: () => Promise<any>;
}

export function useDrafts(userId: string | undefined, boardId: string | undefined): UseDraftsResult {
  const { data: drafts, isLoading, refetch } = useQuery({
    queryKey: ['drafts', userId, boardId],
    queryFn: async () => {
      if (!userId) return [];
      return boardId 
        ? await getDrafts(userId, boardId) 
        : await getDrafts(userId);
    },
    enabled: !!userId,
    cacheTime: 0, // 캐시 사용하지 않음
    staleTime: 0, // 항상 최신 데이터 가져오기
  });
  
  return { drafts, isLoading, refetch };
} 