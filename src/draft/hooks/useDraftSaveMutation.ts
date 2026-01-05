import { MutableRefObject } from 'react';
import { useMutation } from '@tanstack/react-query';
import { saveDraft } from '@/draft/utils/draftUtils';
import { Draft } from '@/draft/model/Draft';

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
  });
} 