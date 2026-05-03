import { useMutation } from '@tanstack/react-query';
import type { MutableRefObject } from 'react';
import { useCallback, useRef, useState } from 'react';
import { useInterval } from 'react-simplikit';
import { toast } from 'sonner';

import type { Draft } from '@/draft/model/Draft';
import { saveDraft as defaultSaveDraft } from '@/draft/utils/draftUtils';
import {
  calculateDraftRetryDelay,
  DEFAULT_DRAFT_AUTOSAVE_INTERVAL_MS,
  getDraftSaveErrorMessage,
  hasContentChanged,
  shouldRetryDraftSave,
  shouldSkipEmptyDraft,
  type DraftContentSnapshot,
} from '@/draft/utils/draftAutosaveLogic';
import { createSquashableInvoker } from '@/draft/utils/squashableInvoker';

type SaveDraftFn = typeof defaultSaveDraft;

const MISSING_AUTH_OR_BOARD_MESSAGE = '로그인 또는 게시판 정보가 없습니다.';
const INVALID_CONTENT_TYPE_MESSAGE = 'Title and content must be strings';
const ERROR_TOAST_DURATION_MS = 5000;
const ERROR_TOAST_POSITION = 'bottom-center' as const;

interface UseDraftAutosaveProps {
  boardId: string;
  userId: string | undefined;
  title: string;
  content: string;
  initialDraftId?: string;
  intervalMs?: number;
  enabled?: boolean;
  /**
   * Port at the persistence seam. Defaults to the production Supabase adapter.
   * Tests inject an in-memory implementation.
   */
  saveDraftFn?: SaveDraftFn;
}

interface UseDraftAutosaveResult {
  draftId: string | null;
  lastSavedAt: Date | null;
  isSaving: boolean;
  savingError: Error | null;
  manualSave: () => Promise<void>;
}

function useLatestValueRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/**
 * Owns Autosave + Manual Save for a Draft on a Board.
 *
 * Interface invariants:
 *  - All writes (interval + manualSave) flow through one squash invoker, so at
 *    most one save is in flight at a time and at most one follow-up is queued.
 *    The follow-up reads live content via refs at the moment it runs, so the
 *    latest user input always wins. Without this, a manual save during an
 *    in-flight interval mutation would spawn a concurrent write — and if
 *    draftId is still null at that point, two drafts would be created.
 *  - Empty title AND empty content → save is skipped silently.
 *  - Retry: at most {@link MAX_DRAFT_RETRY_ATTEMPTS} attempts, exponential backoff
 *    capped at {@link MAX_DRAFT_RETRY_DELAY_MS}; no retry on SupabaseWriteError or TypeError.
 *  - Errors raise a Korean toast and surface via savingError.
 *  - Caller passes live title/content each render; refs handle stale closures.
 */
export function useDraftAutosave({
  boardId,
  userId,
  title,
  content,
  initialDraftId,
  intervalMs = DEFAULT_DRAFT_AUTOSAVE_INTERVAL_MS,
  enabled = true,
  saveDraftFn = defaultSaveDraft,
}: UseDraftAutosaveProps): UseDraftAutosaveResult {
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<DraftContentSnapshot>({
    title,
    content,
  });

  const draftIdRef = useLatestValueRef(draftId);
  const titleRef = useLatestValueRef(title);
  const contentRef = useLatestValueRef(content);
  const saveDraftFnRef = useLatestValueRef(saveDraftFn);

  const { mutateAsync, isLoading, error } = useMutation<Draft | null, Error, void>({
    mutationKey: ['draft', 'save', boardId],
    mutationFn: async () => {
      if (!userId || !boardId) {
        throw new Error(MISSING_AUTH_OR_BOARD_MESSAGE);
      }
      const currentTitle = titleRef.current;
      const currentContent = contentRef.current;
      if (typeof currentTitle !== 'string' || typeof currentContent !== 'string') {
        throw new Error(INVALID_CONTENT_TYPE_MESSAGE);
      }
      if (shouldSkipEmptyDraft(currentTitle, currentContent)) return null;

      const savedDraft = await saveDraftFnRef.current(
        {
          id: draftIdRef.current ?? undefined,
          boardId,
          title: currentTitle,
          content: currentContent,
        },
        userId,
      );

      setDraftId(savedDraft.id);
      setLastSavedAt(new Date(savedDraft.savedAt));
      setLastSavedSnapshot({ title: currentTitle, content: currentContent });
      return savedDraft;
    },
    retry: (failureCount, mutationError) => shouldRetryDraftSave(failureCount, mutationError),
    retryDelay: calculateDraftRetryDelay,
    onError: (mutationError) => {
      toast.warning(getDraftSaveErrorMessage(mutationError), {
        position: ERROR_TOAST_POSITION,
        duration: ERROR_TOAST_DURATION_MS,
      });
    },
  });

  const mutateAsyncRef = useLatestValueRef(mutateAsync);
  const squashedSaveRef = useRef<() => Promise<void>>();
  if (!squashedSaveRef.current) {
    squashedSaveRef.current = createSquashableInvoker(async () => {
      await mutateAsyncRef.current();
    });
  }

  const manualSave = useCallback(async () => {
    await squashedSaveRef.current!();
  }, []);

  useInterval(
    () => {
      const current: DraftContentSnapshot = {
        title: titleRef.current,
        content: contentRef.current,
      };
      if (shouldSkipEmptyDraft(current.title, current.content)) return;
      if (!hasContentChanged(current, lastSavedSnapshot)) return;
      void squashedSaveRef.current!();
    },
    { delay: intervalMs, enabled },
  );

  return {
    draftId,
    lastSavedAt,
    isSaving: isLoading,
    savingError: error ?? null,
    manualSave,
  };
}
