import { useState, useEffect, useRef } from 'react';
import { saveDraft } from '@/draft/utils/draftUtils';

interface UseAutoSaveDraftsProps {
  boardId: string;
  userId: string | undefined;
  title: string;
  content: string;
  initialDraftId?: string;
  autoSaveInterval?: number; // 밀리초 단위
}

interface UseAutoSaveDraftsResult {
  draftId: string | null;
  lastSavedAt: Date | null;
  isSaving: boolean;
  savingError: Error | null;
  manualSave: () => Promise<void>;
}

export function useAutoSaveDrafts({
  boardId,
  userId,
  title,
  content,
  initialDraftId,
  autoSaveInterval = 10000, // 기본값 10초
}: UseAutoSaveDraftsProps): UseAutoSaveDraftsResult {
  // initialDraftId가 있으면 그것을 사용, 없으면 null
  const [draftId, setDraftId] = useState<string | null>(initialDraftId || null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savingError, setSavingError] = useState<Error | null>(null);
  
  // 이전 값을 추적하기 위한 refs
  const prevTitleRef = useRef<string>(title);
  const prevContentRef = useRef<string>(content);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // initialDraftId가 변경되면 draftId 상태 업데이트
  useEffect(() => {
    if (initialDraftId) {
      setDraftId(initialDraftId);
    }
  }, [initialDraftId]);
  
  // 초안 저장 함수
  const saveDraftData = async () => {
    if (!userId || (!title.trim() && !content.trim())) {
      return;
    }
    
    try {
      setIsSaving(true);
      setSavingError(null);
      
      const savedDraft = await saveDraft(
        {
          id: draftId || undefined, // draftId가 있으면 사용, 없으면 undefined
          boardId,
          title,
          content,
        },
        userId
      );
      
      // 첫 저장 시에만 ID 업데이트
      if (!draftId) {
        setDraftId(savedDraft.id);
      }
      
      setLastSavedAt(savedDraft.savedAt.toDate());
      
      // 이전 값 업데이트
      prevTitleRef.current = title;
      prevContentRef.current = content;
    } catch (error) {
      setSavingError(error instanceof Error ? error : new Error('초안 저장 중 오류가 발생했습니다.'));
    } finally {
      setIsSaving(false);
    }
  };
  
  // 수동 저장 함수
  const manualSave = async () => {
    await saveDraftData();
  };
  
  // 변경 감지 및 자동 저장 설정
  useEffect(() => {
    // 사용자가 로그인하지 않았거나 게시판 ID가 없으면 자동 저장 비활성화
    if (!userId || !boardId) {
      return;
    }
    
    // 내용이 변경되었는지 확인
    const titleChanged = title !== prevTitleRef.current;
    const contentChanged = content !== prevContentRef.current;
    
    // 변경된 경우에만 타이머 설정
    if (titleChanged || contentChanged) {
      // 이전 타이머가 있으면 취소
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // 새 타이머 설정
      timerRef.current = setTimeout(() => {
        saveDraftData();
      }, autoSaveInterval);
    }
    
    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [userId, boardId, title, content, autoSaveInterval]);
  
  return {
    draftId,
    lastSavedAt,
    isSaving,
    savingError,
    manualSave,
  };
}
