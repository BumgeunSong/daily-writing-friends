import { useState, useCallback } from 'react';
import { usePreviousValue } from './usePreviousValue';
import { useDraftSaveMutation } from './useDraftSaveMutation';
import { useIntervalAutoSave } from './useIntervalAutoSave';

interface UseAutoSaveDraftsProps {
  boardId: string;
  userId: string | undefined;
  title: string;
  content: string;
  initialDraftId?: string;
  intervalMs?: number; // 주기적 저장 (기본 10000)
}

interface UseAutoSaveDraftsResult {
  draftId: string | null;
  lastSavedAt: Date | null;
  isSaving: boolean;
  savingError: Error | null;
  manualSave: () => Promise<void>;
}

/**
 * 임시 저장 초안(Draft)을 10초마다 자동으로 저장하는 커스텀 훅입니다.
 * 
 * - 10초마다 title/content가 이전 값과 다를 때만 저장하여 불필요한 API 호출을 방지합니다.
 * - 수동 저장(manualSave) 함수도 제공합니다.
 * - react-query의 useMutation을 활용하여 저장 상태, 에러, 로딩을 관리합니다.
 * 
 * @param {Object} params - 훅에 전달할 파라미터 객체
 * @param {string} params.boardId - 게시판 ID (필수)
 * @param {string|undefined} params.userId - 사용자 ID (필수)
 * @param {string} params.title - 현재 입력 중인 제목
 * @param {string} params.content - 현재 입력 중인 본문
 * @param {string} [params.initialDraftId] - 최초 draftId (있으면 해당 draft를 이어서 저장)
 * @param {number} [params.intervalMs=10000] - 주기적 저장 간격(ms)
 * 
 * @returns {Object} 반환값 객체
 * @returns {string|null} return.draftId - 현재 임시저장 draft의 ID
 * @returns {Date|null} return.lastSavedAt - 마지막 저장 시각
 * @returns {boolean} return.isSaving - 저장 중 여부(로딩 상태)
 * @returns {Error|null} return.savingError - 저장 중 발생한 에러
 * @returns {() => Promise<void>} return.manualSave - 수동 저장 함수
 * 
 * @example
 * const {
 *   draftId,
 *   lastSavedAt,
 *   isSaving,
 *   savingError,
 *   manualSave
 * } = useAutoSaveDrafts({
 *   boardId: 'board123',
 *   userId: currentUser?.uid,
 *   title,
 *   content,
 *   initialDraftId: loadedDraftId,
 *   intervalMs: 10000,
 * });
 */
export function useAutoSaveDrafts({
  boardId,
  userId,
  title,
  content,
  initialDraftId,
  intervalMs = 10000,
}: UseAutoSaveDraftsProps): UseAutoSaveDraftsResult {
  const [draftId, setDraftId] = useState<string | null>(initialDraftId || null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const prevTitleRef = usePreviousValue(title);
  const prevContentRef = usePreviousValue(content);

  // 변경 감지
  const hasChanged = title !== prevTitleRef.current || content !== prevContentRef.current;

  // 저장 mutation
  const { mutateAsync: saveDraftMutate, isLoading, error } = useDraftSaveMutation({
    draftId,
    boardId,
    userId,
    title,
    content,
    onSaved: (savedDraft) => {
      setDraftId(savedDraft.id);
      setLastSavedAt(savedDraft.savedAt.toDate());
    },
  });

  // 수동 저장
  const manualSave = useCallback(async () => {
    await saveDraftMutate();
  }, [saveDraftMutate]);

  // 10초 interval 저장
  useIntervalAutoSave(hasChanged, saveDraftMutate, intervalMs);

  return {
    draftId,
    lastSavedAt,
    isSaving: isLoading,
    savingError: error as Error | null,
    manualSave,
  };
}
