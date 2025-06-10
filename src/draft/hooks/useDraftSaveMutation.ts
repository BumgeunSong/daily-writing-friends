import { useMutation } from '@tanstack/react-query';
import { saveDraft } from '@/draft/utils/draftUtils';

interface UseDraftSaveMutationProps {
  draftId: string | null;
  boardId: string;
  userId: string | undefined;
  title: string;
  content: string;
  onSaved?: (savedDraft: any) => void;
}

export function useDraftSaveMutation({
  draftId,
  boardId,
  userId,
  title,
  content,
  onSaved,
}: UseDraftSaveMutationProps) {
  return useMutation({
    mutationFn: async () => {
      if (!userId || !boardId) throw new Error('로그인 또는 게시판 정보가 없습니다.');
      if (!title.trim() && !content.trim()) return null;
      const savedDraft = await saveDraft(
        {
          id: draftId || undefined,
          boardId,
          title,
          content,
        },
        userId
      );
      onSaved?.(savedDraft);
      return savedDraft;
    },
  });
} 