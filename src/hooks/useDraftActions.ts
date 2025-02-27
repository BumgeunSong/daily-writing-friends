import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Draft } from '@/types/Draft';

interface UseDraftActionsProps {
  userId: string | undefined;
  onClose: () => void;
}

export function useDraftActions({ userId, onClose }: UseDraftActionsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // 임시 저장 글 선택 핸들러
  const handleSelectDraft = (draft: Draft) => {
    if (!userId) return;
    
    // 캐시에 임시 저장 글 데이터 미리 저장
    queryClient.setQueryData(['draft', userId, draft.id, draft.boardId], draft);
    
    // 쿼리 무효화하여 새 페이지에서 다시 실행되도록 함
    queryClient.invalidateQueries({
      queryKey: ['draft', userId, draft.id, draft.boardId],
      exact: true,
      refetchType: 'none' // 즉시 리페치하지 않고 다음 렌더링에서 실행되도록 함
    });
    
    // 드로어 닫기
    onClose();
    
    // URL 파라미터로 임시 저장 글 ID 전달
    navigate(`/create/${draft.boardId}?draftId=${draft.id}`);
  };
  
  return { handleSelectDraft };
} 