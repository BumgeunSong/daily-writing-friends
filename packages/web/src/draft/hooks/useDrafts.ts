import { useQuery, QueryObserverResult } from '@tanstack/react-query';
import { Draft } from '@/draft/model/Draft';
import { getDrafts } from '@/draft/utils/draftUtils';

interface UseDraftsResult {
  drafts: Draft[] | undefined;
  isLoading: boolean;
  refetch: () => Promise<QueryObserverResult<Draft[], unknown>>;
}

export function useDrafts(userId: string | undefined, boardId: string | undefined): UseDraftsResult {
  const { data: drafts, isLoading, refetch } = useQuery<Draft[]>({
    queryKey: ['drafts', userId, boardId],
    queryFn: async () => {
      if (!userId) return [];
      return boardId 
        ? await getDrafts(userId, boardId) 
        : await getDrafts(userId);
    },
    enabled: userId != null,
    cacheTime: 0, // 캐시 사용하지 않음
    staleTime: 0, // 항상 최신 데이터 가져오기
  });
  
  return { drafts, isLoading, refetch };
} 