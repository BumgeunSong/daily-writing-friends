import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Draft } from '@/types/Draft';
import { getDraftById } from '@/utils/draftUtils';

interface UseDraftLoaderProps {
  userId: string | undefined;
  boardId: string | undefined;
  draftId: string | null;
}

interface UseDraftLoaderResult {
  draft: Draft | null;
  draftId: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useDraftLoader({
  userId,
  boardId,
  draftId
}: UseDraftLoaderProps): UseDraftLoaderResult {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loadedDraftId, setLoadedDraftId] = useState<string | null>(draftId);
  const queryClient = useQueryClient();

  const { isLoading, error, refetch } = useQuery({
    queryKey: ['draft', userId, draftId, boardId],
    queryFn: async () => {
      if (!draftId || !userId || !boardId) return null;
      
      // 캐시에서 먼저 확인
      const cachedDraft = queryClient.getQueryData(['draft', userId, draftId, boardId]);
      if (cachedDraft) {
        return cachedDraft;
      }
      
      // 캐시에 없으면 서버에서 가져오기
      const draft = await getDraftById(userId, draftId);
      if (draft && draft.boardId === boardId) {
        return draft;
      }
      return null;
    },
    enabled: !!draftId && !!userId && !!boardId,
    staleTime: Infinity,
    retry: 1,
    onSuccess: (data: Draft | null) => {
      if (data) {
        setDraft(data);
        setLoadedDraftId(data.id);
      }
    }
  });
  
  // 컴포넌트 마운트 시 쿼리 리페치
  useEffect(() => {
    if (draftId && userId && boardId) {
      refetch();
    }
  }, [draftId, userId, boardId, refetch]);

  return { 
    draft, 
    draftId: loadedDraftId,
    isLoading, 
    error: error as Error | null 
  };
} 