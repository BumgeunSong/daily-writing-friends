import { SupabaseWriteError } from '@/shared/api/supabaseClient';

export const DEFAULT_DRAFT_AUTOSAVE_INTERVAL_MS = 10_000;
export const MAX_DRAFT_RETRY_ATTEMPTS = 3;
export const BASE_DRAFT_RETRY_DELAY_MS = 1_000;
export const MAX_DRAFT_RETRY_DELAY_MS = 8_000;

const TIMEOUT_ERROR_MESSAGE = '네트워크 연결이 불안정해서 임시 저장하지 못했어요';
const GENERIC_ERROR_MESSAGE = '임시 저장에 문제가 생겼어요';

export interface DraftContentSnapshot {
  title: string;
  content: string;
}

export function hasContentChanged(
  current: DraftContentSnapshot,
  lastSaved: DraftContentSnapshot,
): boolean {
  if (current.title !== lastSaved.title) return true;
  if (current.content !== lastSaved.content) return true;
  return false;
}

export function shouldSkipEmptyDraft(title: string, content: string): boolean {
  return !title.trim() && !content.trim();
}

export function shouldRetryDraftSave(failureCount: number, error: Error): boolean {
  if (failureCount >= MAX_DRAFT_RETRY_ATTEMPTS) return false;
  if (error instanceof SupabaseWriteError) return false;
  if (error instanceof TypeError) return false;
  return true;
}

export function calculateDraftRetryDelay(attemptIndex: number): number {
  const exponentialDelay = BASE_DRAFT_RETRY_DELAY_MS * Math.pow(2, attemptIndex);
  return Math.min(exponentialDelay, MAX_DRAFT_RETRY_DELAY_MS);
}

export function getDraftSaveErrorMessage(error: Error): string {
  const isTimeout = error.message?.includes('timed out') ?? false;
  if (isTimeout) return TIMEOUT_ERROR_MESSAGE;
  return GENERIC_ERROR_MESSAGE;
}
