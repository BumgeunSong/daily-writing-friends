import { useMutation } from '@tanstack/react-query';
import { MutableRefObject } from 'react';
import { toast } from 'sonner';
import { Draft } from '@/draft/model/Draft';
import { saveDraft } from '@/draft/utils/draftUtils';

interface UseDraftSaveMutationProps {
  draftIdRef: MutableRefObject<string | null>;
  boardId: string;
  userId: string | undefined;
  titleRef: MutableRefObject<string>;
  contentRef: MutableRefObject<string>;
  onSaved?: (savedDraft: Draft) => void;
}

export function useDraftSaveMutation({
  draftIdRef,
  boardId,
  userId,
  titleRef,
  contentRef,
  onSaved,
}: UseDraftSaveMutationProps) {
  return useMutation({
    mutationFn: async () => {
      if (!userId || !boardId) throw new Error('로그인 또는 게시판 정보가 없습니다.');

      const currentTitle = titleRef.current;
      const currentContent = contentRef.current;

      if (typeof currentTitle !== 'string' || typeof currentContent !== 'string') {
        throw new Error('Title and content must be strings');
      }

      if (!currentTitle.trim() && !currentContent.trim()) return null;

      const savedDraft = await saveDraft(
        {
          id: draftIdRef.current || undefined,
          boardId,
          title: currentTitle,
          content: currentContent,
        },
        userId
      );
      onSaved?.(savedDraft);
      return savedDraft;
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 8000),
    onError: (error: Error) => {
      const isTimeout = error.message?.includes('timed out');
      toast.warning(
        isTimeout
          ? '네트워크 연결이 불안정해서 임시 저장하지 못했어요'
          : '임시 저장에 문제가 생겼어요',
        {
          position: 'bottom-center',
          duration: 5000,
        }
      );
    },
  });
} 