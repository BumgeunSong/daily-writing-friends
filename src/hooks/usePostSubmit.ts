import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createPost } from '@/utils/postUtils';
import { deleteDraft } from '@/utils/draftUtils';
import { sendAnalyticsEvent, AnalyticsEvent } from '@/utils/analyticsUtils';

interface UsePostSubmitProps {
  userId: string | undefined;
  userName: string;
  boardId: string | undefined;
  draftId: string | null;
  title: string;
  content: string;
}

interface UsePostSubmitResult {
  isSubmitting: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function usePostSubmit({
  userId,
  userName,
  boardId,
  draftId,
  title,
  content
}: UsePostSubmitProps): UsePostSubmitResult {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    if (!boardId || !userId) return;
    
    try {
      setIsSubmitting(true);
      await createPost(boardId, title, content, userId, userName);
      sendAnalyticsEvent(AnalyticsEvent.CREATE_POST, {
        boardId,
        title,
        userId,
        userName
      });
      // 게시물 작성 성공 후 초안 삭제
      if (draftId) {
        await deleteDraft(userId, draftId);
        
        // 캐시에서도 삭제
        queryClient.removeQueries({
          queryKey: ['draft', userId, draftId, boardId],
          exact: true
        });
        
        // 초안 목록 캐시 무효화
        queryClient.invalidateQueries({
          queryKey: ['drafts', userId],
        });
      }
      
      // 게시물 목록 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: ['posts', boardId],
      });
      
      navigate(`/board/${boardId}`);
    } catch (error) {
      console.error('게시물 작성 중 오류가 발생했습니다:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, handleSubmit };
} 