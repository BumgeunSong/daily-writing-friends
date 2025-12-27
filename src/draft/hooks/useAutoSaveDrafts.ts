import { useState, useCallback, useRef, MutableRefObject } from 'react';
import { useInterval } from 'react-simplikit';
import { useDraftSaveMutation } from './useDraftSaveMutation';

interface UseAutoSaveDraftsProps {
  boardId: string;
  userId: string | undefined;
  title: string;
  content: string;
  initialDraftId?: string;
  intervalMs?: number;
  enabled?: boolean;
}

interface UseAutoSaveDraftsResult {
  draftId: string | null;
  lastSavedAt: Date | null;
  isSaving: boolean;
  savingError: Error | null;
  manualSave: () => Promise<void>;
}

interface DraftContent {
  title: string;
  content: string;
}

/**
 * Hook to track the latest value in a ref for use in callbacks.
 * This avoids stale closure issues in intervals and event handlers.
 */
function useLatestValueRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/**
 * Hook to prevent concurrent execution of async operations.
 * If an operation is already in-flight, subsequent calls will wait for it to complete.
 */
function useConcurrentOperationGuard() {
  const currentOperationPromiseRef = useRef<Promise<unknown> | null>(null);

  const executeWithGuard = useCallback(async <T>(operation: () => Promise<T>): Promise<T | undefined> => {
    if (currentOperationPromiseRef.current !== null) {
      await currentOperationPromiseRef.current;
      return undefined;
    }

    const operationPromise = operation();
    currentOperationPromiseRef.current = operationPromise;

    try {
      return await operationPromise;
    } finally {
      currentOperationPromiseRef.current = null;
    }
  }, []);

  return { executeWithGuard };
}

function hasContentChanged(
  currentContent: DraftContent,
  lastSavedContent: DraftContent
): boolean {
  const titleHasChanged = currentContent.title !== lastSavedContent.title;
  const contentHasChanged = currentContent.content !== lastSavedContent.content;
  return titleHasChanged || contentHasChanged;
}

export function useAutoSaveDrafts({
  boardId,
  userId,
  title,
  content,
  initialDraftId,
  intervalMs = 10000,
  enabled = true,
}: UseAutoSaveDraftsProps): UseAutoSaveDraftsResult {
  const [draftId, setDraftId] = useState<string | null>(initialDraftId || null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastSavedTitle, setLastSavedTitle] = useState<string>(title);
  const [lastSavedContent, setLastSavedContent] = useState<string>(content);

  const draftIdRef = useLatestValueRef(draftId);
  const currentTitleRef = useLatestValueRef(title);
  const currentContentRef = useLatestValueRef(content);
  const isAutoSaveEnabledRef = useLatestValueRef(enabled);

  const { executeWithGuard } = useConcurrentOperationGuard();

  const { mutateAsync: saveDraftMutate, isLoading, error } = useDraftSaveMutation({
    draftIdRef,
    boardId,
    userId,
    titleRef: currentTitleRef,
    contentRef: currentContentRef,
    onSaved: (savedDraft) => {
      setDraftId(savedDraft.id);
      setLastSavedAt(savedDraft.savedAt.toDate());
      setLastSavedTitle(currentTitleRef.current);
      setLastSavedContent(currentContentRef.current);
    },
  });

  const manualSave = useCallback(async () => {
    await executeWithGuard(() => saveDraftMutate());
  }, [executeWithGuard, saveDraftMutate]);

  useInterval(() => {
    const isAutoSaveDisabled = !isAutoSaveEnabledRef.current;
    if (isAutoSaveDisabled) return;

    const currentContent: DraftContent = {
      title: currentTitleRef.current,
      content: currentContentRef.current,
    };
    const lastSaved: DraftContent = {
      title: lastSavedTitle,
      content: lastSavedContent,
    };

    const shouldSaveDraft = hasContentChanged(currentContent, lastSaved);
    if (shouldSaveDraft) {
      executeWithGuard(() => saveDraftMutate());
    }
  }, intervalMs);

  return {
    draftId,
    lastSavedAt,
    isSaving: isLoading,
    savingError: error as Error | null,
    manualSave,
  };
}
