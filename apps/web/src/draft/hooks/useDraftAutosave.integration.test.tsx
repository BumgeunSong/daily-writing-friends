import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useDraftAutosave } from './useDraftAutosave';
import { deferred } from '@/test/utils/deferred';
import { createTestQueryClient } from '@/test/utils/withProviders';
import type { Draft } from '@/draft/model/Draft';
import type { FirebaseTimestamp } from '@/shared/model/Timestamp';

/**
 * Race seam under test: squashableInvoker ↔ draftIdRef.
 *
 * PostCreationPage's publish flow awaits manualSave() and submits the resolved
 * draft id so createPostAction deletes the right draft row. That contract only
 * holds if (1) manualSave resolves with the id of the completed save and
 * (2) a save queued behind an in-flight save updates the same draft instead of
 * creating a duplicate — even though no React re-render happens between the
 * in-flight save finishing and the queued follow-up starting.
 */

const SAVED_DRAFT_ID = 'draft-1';

function makeDraft(id: string): Draft {
  return {
    id,
    boardId: 'board-1',
    title: '제목',
    content: '내용',
    savedAt: { toDate: () => new Date('2026-07-31T00:00:00Z') } as unknown as FirebaseTimestamp,
  };
}

function renderAutosave(saveDraftFn: (draft: Partial<Draft>, userId: string) => Promise<Draft>) {
  const queryClient = createTestQueryClient();
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(
    () =>
      useDraftAutosave({
        boardId: 'board-1',
        userId: 'user-1',
        title: '제목',
        content: '내용',
        intervalMs: 60_000,
        saveDraftFn: saveDraftFn as never,
      }),
    { wrapper },
  );
}

describe('useDraftAutosave — manualSave race contract', () => {
  it('resolves manualSave with the draft id of the completed save', async () => {
    const receivedDraftIds: Array<string | undefined> = [];
    const saveDraftFn = vi.fn(async (draft: Partial<Draft>) => {
      receivedDraftIds.push(draft.id);
      return makeDraft(SAVED_DRAFT_ID);
    });
    const { result } = renderAutosave(saveDraftFn);

    let savedId: string | null = null;
    await act(async () => {
      savedId = await result.current.manualSave();
    });

    expect(savedId).toBe(SAVED_DRAFT_ID);
    expect(receivedDraftIds).toEqual([undefined]);
  });

  it('updates the same draft when a save is queued behind an in-flight save', async () => {
    const firstSaveGate = deferred();
    const receivedDraftIds: Array<string | undefined> = [];
    const saveDraftFn = vi.fn(async (draft: Partial<Draft>) => {
      receivedDraftIds.push(draft.id);
      if (receivedDraftIds.length === 1) await firstSaveGate.promise;
      return makeDraft(SAVED_DRAFT_ID);
    });
    const { result } = renderAutosave(saveDraftFn);

    let queuedSavedId: string | null = null;
    await act(async () => {
      const inFlightSave = result.current.manualSave();
      const queuedSave = result.current.manualSave();
      firstSaveGate.resolve();
      await inFlightSave;
      queuedSavedId = await queuedSave;
    });

    expect(receivedDraftIds).toEqual([undefined, SAVED_DRAFT_ID]);
    expect(queuedSavedId).toBe(SAVED_DRAFT_ID);
    expect(result.current.draftId).toBe(SAVED_DRAFT_ID);
  });
});
