import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { deleteDraft } from '@/utils/draftUtils';
import { Draft } from '@/types/Draft';
import { toast } from '@/hooks/use-toast';

interface UseDraftActionsProps {
  userId: string | undefined;
  onClose: () => void;
  refetchDrafts: () => Promise<any>;
}

export function useDraftActions({ userId, onClose, refetchDrafts }: UseDraftActionsProps) {
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
  
  // 임시 저장 글 삭제 핸들러
  const handleDeleteDraft = async (draft: Draft, e: React.MouseEvent) => {
    e.stopPropagation(); // 부모 요소의 클릭 이벤트 전파 방지
    
    if (!userId) return;
    
    try {
      // 임시 저장 글 삭제
      await deleteDraft(userId, draft.id);
      
      // 캐시에서도 삭제
      queryClient.removeQueries({
        queryKey: ['draft', userId, draft.id, draft.boardId],
        exact: true
      });
      
      // 임시 저장 글 목록 다시 불러오기
      refetchDrafts();
      
      // 성공 메시지 표시
      toast({
        title: "임시 저장 글 삭제 완료",
        description: "임시 저장 글이 삭제되었습니다.",
        variant: "default",
      });
    } catch (error) {
      console.error('임시 저장 글 삭제 중 오류 발생:', error);
      
      // 오류 메시지 표시
      toast({
        title: "임시 저장 글 삭제 실패",
        description: "임시 저장 글을 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };
  
  return { handleSelectDraft, handleDeleteDraft };
} 