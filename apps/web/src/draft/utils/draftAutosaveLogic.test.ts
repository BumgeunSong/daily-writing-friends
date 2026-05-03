import { describe, it, expect } from 'vitest';

import { SupabaseWriteError } from '@/shared/api/supabaseClient';
import {
  hasContentChanged,
  shouldSkipEmptyDraft,
  shouldRetryDraftSave,
  calculateDraftRetryDelay,
  getDraftSaveErrorMessage,
  MAX_DRAFT_RETRY_ATTEMPTS,
  BASE_DRAFT_RETRY_DELAY_MS,
  MAX_DRAFT_RETRY_DELAY_MS,
} from './draftAutosaveLogic';

describe('draftAutosaveLogic', () => {
  describe('hasContentChanged', () => {
    describe('when title and content are identical', () => {
      it('returns false', () => {
        const snapshot = { title: 'A', content: 'B' };
        expect(hasContentChanged(snapshot, snapshot)).toBe(false);
      });
    });

    describe('when only title differs', () => {
      it('returns true', () => {
        const current = { title: 'A1', content: 'B' };
        const lastSaved = { title: 'A2', content: 'B' };
        expect(hasContentChanged(current, lastSaved)).toBe(true);
      });
    });

    describe('when only content differs', () => {
      it('returns true', () => {
        const current = { title: 'A', content: 'B1' };
        const lastSaved = { title: 'A', content: 'B2' };
        expect(hasContentChanged(current, lastSaved)).toBe(true);
      });
    });
  });

  describe('shouldSkipEmptyDraft', () => {
    describe('when both title and content are empty strings', () => {
      it('returns true', () => {
        expect(shouldSkipEmptyDraft('', '')).toBe(true);
      });
    });

    describe('when both title and content are whitespace-only', () => {
      it('returns true', () => {
        expect(shouldSkipEmptyDraft('   ', '\n\t ')).toBe(true);
      });
    });

    describe('when title has content', () => {
      it('returns false', () => {
        expect(shouldSkipEmptyDraft('hello', '')).toBe(false);
      });
    });

    describe('when content has content', () => {
      it('returns false', () => {
        expect(shouldSkipEmptyDraft('', 'hello')).toBe(false);
      });
    });
  });

  describe('shouldRetryDraftSave', () => {
    describe('when failure count is under the limit', () => {
      it('returns true for a generic transient error', () => {
        expect(shouldRetryDraftSave(0, new Error('network'))).toBe(true);
        expect(shouldRetryDraftSave(2, new Error('network'))).toBe(true);
      });
    });

    describe('when failure count reaches the limit', () => {
      it('returns false', () => {
        expect(shouldRetryDraftSave(MAX_DRAFT_RETRY_ATTEMPTS, new Error('network'))).toBe(false);
      });
    });

    describe('when error is a SupabaseWriteError', () => {
      it('returns false regardless of failure count', () => {
        const writeError = new SupabaseWriteError({
          message: 'rls denied',
          code: '42501',
          details: '',
          hint: '',
          name: 'PostgrestError',
        });
        expect(shouldRetryDraftSave(0, writeError)).toBe(false);
      });
    });

    describe('when error is a TypeError', () => {
      it('returns false regardless of failure count', () => {
        expect(shouldRetryDraftSave(0, new TypeError('bad input'))).toBe(false);
      });
    });
  });

  describe('calculateDraftRetryDelay', () => {
    describe('on the first retry attempt', () => {
      it('returns the base delay', () => {
        expect(calculateDraftRetryDelay(0)).toBe(BASE_DRAFT_RETRY_DELAY_MS);
      });
    });

    describe('on subsequent attempts', () => {
      it('doubles the delay each time', () => {
        expect(calculateDraftRetryDelay(1)).toBe(BASE_DRAFT_RETRY_DELAY_MS * 2);
        expect(calculateDraftRetryDelay(2)).toBe(BASE_DRAFT_RETRY_DELAY_MS * 4);
      });
    });

    describe('when exponential growth would exceed the cap', () => {
      it('returns the maximum delay', () => {
        expect(calculateDraftRetryDelay(10)).toBe(MAX_DRAFT_RETRY_DELAY_MS);
      });
    });
  });

  describe('getDraftSaveErrorMessage', () => {
    describe('when error message indicates a timeout', () => {
      it('returns the network instability message', () => {
        const error = new Error('Request timed out after 5s');
        expect(getDraftSaveErrorMessage(error)).toBe(
          '네트워크 연결이 불안정해서 임시 저장하지 못했어요'
        );
      });
    });

    describe('when error is any other failure', () => {
      it('returns the generic save problem message', () => {
        const error = new Error('Internal server error');
        expect(getDraftSaveErrorMessage(error)).toBe('임시 저장에 문제가 생겼어요');
      });
    });
  });
});
