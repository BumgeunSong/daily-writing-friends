import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Draft } from '@/draft/model/Draft';
import { deleteDraft } from '@/draft/utils/draftUtils';
import { toast } from '@/shared/hooks/use-toast';

interface UseDeleteDraftProps {
  userId: string | undefined;
  onDeleteSuccess?: () => void;
}

export function useDeleteDraft({ userId, onDeleteSuccess }: UseDeleteDraftProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<Draft | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();
  
  // 삭제 대화상자 열기
  const openDeleteDialog = (draft: Draft, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // 부모 요소의 클릭 이벤트 전파 방지
    }
    setDraftToDelete(draft);
    setIsDeleteDialogOpen(true);
  };
  
  // 삭제 대화상자 닫기
  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDraftToDelete(null);
  };
  
  // 실제 삭제 처리
  const confirmDelete = async () => {
    if (!userId || !draftToDelete) return;
    
    setIsDeleting(true);
    
    try {
      // 임시 저장 글 삭제
      await deleteDraft(userId, draftToDelete.id);
      
      // 캐시에서도 삭제
      queryClient.removeQueries({
        queryKey: ['draft', userId, draftToDelete.id, draftToDelete.boardId],
        exact: true
      });
      
      // 성공 메시지 표시
      toast({
        title: "임시 저장 글 삭제 완료",
        description: "임시 저장 글이 삭제되었습니다.",
        variant: "default",
      });
      
      // 성공 콜백 호출
      if (onDeleteSuccess) {
        onDeleteSuccess();
      }
    } catch (error) {
      console.error('임시 저장 글 삭제 중 오류 발생:', error);
      
      // 오류 메시지 표시
      toast({
        title: "임시 저장 글 삭제 실패",
        description: "임시 저장 글을 삭제하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      closeDeleteDialog();
    }
  };
  
  return {
    isDeleteDialogOpen,
    draftToDelete,
    isDeleting,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete
  };
} 