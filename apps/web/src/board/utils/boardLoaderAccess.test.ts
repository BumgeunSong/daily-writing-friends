import { describe, expect, it } from 'vitest';
import { SupabaseNetworkError } from '@/shared/api/supabaseClient';
import { buildMissingBoardIdResponse, mapBoardLoaderError } from './boardLoaderAccess';

describe('buildMissingBoardIdResponse', () => {
  it('returns 400 with the missing-board-id message', async () => {
    const response = buildMissingBoardIdResponse();
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Missing board ID');
  });
});

describe('mapBoardLoaderError', () => {
  describe('when the error is already a Response', () => {
    it('returns the same Response unchanged (preserves permission/auth status codes)', () => {
      const original = new Response('Forbidden', { status: 403 });
      expect(mapBoardLoaderError(original)).toBe(original);
    });
  });

  describe('when the error is a SupabaseNetworkError', () => {
    it('returns a 503 response', () => {
      const error = new SupabaseNetworkError({
        message: 'network down',
        details: '',
        hint: '',
        code: '',
      } as never);
      expect(mapBoardLoaderError(error).status).toBe(503);
    });
  });

  describe('when the error is anything else', () => {
    it('returns 500 for a generic Error', () => {
      expect(mapBoardLoaderError(new Error('boom')).status).toBe(500);
    });

    it('returns 500 for a non-Error value (string)', () => {
      expect(mapBoardLoaderError('unexpected').status).toBe(500);
    });

    it('returns 500 for undefined', () => {
      expect(mapBoardLoaderError(undefined).status).toBe(500);
    });
  });
});
