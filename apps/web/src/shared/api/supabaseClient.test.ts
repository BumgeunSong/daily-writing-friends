import type { PostgrestError } from '@supabase/supabase-js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { throwOnError, executeTrackedWrite, SupabaseWriteError, SupabaseNetworkError, isNetworkError, detectSlowWrite } from './supabaseClient';

const mockSetContext = vi.fn();
const mockSetFingerprint = vi.fn();

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  withScope: vi.fn((callback: (scope: { setContext: typeof mockSetContext; setFingerprint: typeof mockSetFingerprint }) => void) => {
    callback({ setContext: mockSetContext, setFingerprint: mockSetFingerprint });
  }),
}));

vi.mock('@/sentry', () => ({
  addSentryBreadcrumb: vi.fn(),
}));

import * as Sentry from '@sentry/react';
import { addSentryBreadcrumb } from '@/sentry';

describe('SupabaseWriteError', () => {
  it('stores the original PostgrestError', () => {
    const postgrestError = {
      message: 'duplicate key',
      code: '23505',
      details: 'Key (id)=(abc) already exists',
      hint: '',
    };
    const error = new SupabaseWriteError(postgrestError);

    expect(error.postgrestError).toBe(postgrestError);
    expect(error.name).toBe('SupabaseWriteError');
    expect(error.message).toContain('duplicate key');
    expect(error.message).toContain('23505');
  });

  it('is an instance of Error', () => {
    const postgrestError = {
      message: 'test',
      code: '42P01',
      details: '',
      hint: '',
    };
    const error = new SupabaseWriteError(postgrestError);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(SupabaseWriteError);
  });
});

describe('throwOnError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetContext.mockClear();
    mockSetFingerprint.mockClear();
  });

  it('does nothing when error is null', () => {
    expect(() => throwOnError({ error: null })).not.toThrow();
    expect(addSentryBreadcrumb).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('throws SupabaseWriteError when error exists', () => {
    const postgrestError = {
      message: 'not found',
      code: 'PGRST116',
      details: 'no rows',
      hint: '',
    };

    expect(() => throwOnError({ error: postgrestError })).toThrow(SupabaseWriteError);
  });

  it('includes error details in thrown error message', () => {
    const postgrestError = {
      message: 'permission denied',
      code: '42501',
      details: 'RLS policy violation',
      hint: '',
    };

    try {
      throwOnError({ error: postgrestError });
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(SupabaseWriteError);
      const writeError = e as SupabaseWriteError;
      expect(writeError.message).toContain('permission denied');
      expect(writeError.message).toContain('42501');
      expect(writeError.message).toContain('RLS policy violation');
      expect(writeError.postgrestError).toBe(postgrestError);
    }
  });

  it('adds Sentry breadcrumb and captures exception on error', () => {
    const postgrestError = {
      message: 'insert failed',
      code: '23503',
      details: 'FK constraint',
      hint: '',
    };

    expect(() => throwOnError({ error: postgrestError }, 'createComment')).toThrow(SupabaseWriteError);

    expect(addSentryBreadcrumb).toHaveBeenCalledWith(
      'Supabase write failed: createComment',
      'supabase.write',
      expect.objectContaining({ code: '23503' }),
      'error',
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(SupabaseWriteError));
  });

  it('uses generic breadcrumb message when operation is omitted', () => {
    const postgrestError = { message: 'fail', code: '500', details: '', hint: '' };

    expect(() => throwOnError({ error: postgrestError })).toThrow(SupabaseWriteError);

    expect(addSentryBreadcrumb).toHaveBeenCalledWith(
      'Supabase write failed',
      'supabase.write',
      expect.anything(),
      'error',
    );
  });

  it('sets permission-denied fingerprint for error code 42501', () => {
    const postgrestError = {
      message: 'permission denied',
      code: '42501',
      details: 'RLS policy violation',
      hint: '',
    };

    expect(() => throwOnError({ error: postgrestError }, 'createComment')).toThrow(SupabaseWriteError);

    expect(mockSetFingerprint).toHaveBeenCalledWith(['supabase', 'permission-denied', 'createComment']);
  });

  it('does not set fingerprint for non-permission errors', () => {
    const postgrestError = { message: 'conflict', code: '23505', details: '', hint: '' };

    expect(() => throwOnError({ error: postgrestError }, 'insertPost')).toThrow(SupabaseWriteError);

    expect(mockSetFingerprint).not.toHaveBeenCalled();
  });

  it('throws SupabaseNetworkError for "Load failed" with empty code', () => {
    const networkError = {
      message: 'TypeError: Load failed',
      code: '',
      details: '@https://example.com/assets/index.js:1270:7060',
      hint: '',
    };

    expect(() => throwOnError({ error: networkError }, 'createComment')).toThrow(SupabaseNetworkError);
  });

  it('does not captureException for network errors', () => {
    const networkError = {
      message: 'TypeError: Load failed',
      code: '',
      details: '',
      hint: '',
    };

    expect(() => throwOnError({ error: networkError })).toThrow(SupabaseNetworkError);

    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(addSentryBreadcrumb).toHaveBeenCalledWith(
      'Supabase network error',
      'supabase.write',
      expect.objectContaining({ message: 'TypeError: Load failed' }),
      'warning',
    );
  });

  it('throws SupabaseNetworkError for "Failed to fetch" with empty code', () => {
    const networkError = {
      message: 'TypeError: Failed to fetch',
      code: '',
      details: '',
      hint: '',
    };

    expect(() => throwOnError({ error: networkError })).toThrow(SupabaseNetworkError);
  });

  it('throws SupabaseWriteError (not network error) when code is present', () => {
    const dbError = {
      message: 'Load failed',
      code: '23505',
      details: '',
      hint: '',
    };

    expect(() => throwOnError({ error: dbError })).toThrow(SupabaseWriteError);
  });
});

describe('executeTrackedWrite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetContext.mockClear();
    mockSetFingerprint.mockClear();
  });

  it('calls the operation and resolves when there is no error', async () => {
    const fn = vi.fn().mockResolvedValue({ error: null });

    await expect(executeTrackedWrite('insertPost', fn)).resolves.toBeUndefined();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('adds a start breadcrumb', async () => {
    const fn = vi.fn().mockResolvedValue({ error: null });

    await executeTrackedWrite('insertPost', fn);

    expect(addSentryBreadcrumb).toHaveBeenCalledWith(
      'Supabase write started: insertPost',
      'supabase.write',
      { operation: 'insertPost' },
    );
  });

  it('throws SupabaseWriteError and reports to Sentry on operation error', async () => {
    const postgrestError = { message: 'conflict', code: '23505', details: '', hint: '' };
    const fn = vi.fn().mockResolvedValue({ error: postgrestError });

    await expect(executeTrackedWrite('insertPost', fn)).rejects.toBeInstanceOf(SupabaseWriteError);

    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(SupabaseWriteError));
  });

});

describe('detectSlowWrite', () => {
  it('returns null when duration is below threshold', () => {
    expect(detectSlowWrite('insertPost', 999)).toBeNull();
  });

  it('returns null when duration is well below threshold', () => {
    expect(detectSlowWrite('insertPost', 0)).toBeNull();
  });

  it('returns a report when duration equals threshold', () => {
    expect(detectSlowWrite('insertPost', 1000)).toEqual({
      breadcrumb: {
        message: 'Slow Supabase write detected: insertPost',
        category: 'supabase.write',
        data: { operation: 'insertPost', durationMs: 1000 },
        level: 'warning',
      },
      consoleMessage: '[Supabase] Slow write detected: insertPost took 1000ms',
    });
  });

  it('returns a report when duration exceeds threshold', () => {
    expect(detectSlowWrite('slowOp', 2500)).toEqual({
      breadcrumb: {
        message: 'Slow Supabase write detected: slowOp',
        category: 'supabase.write',
        data: { operation: 'slowOp', durationMs: 2500 },
        level: 'warning',
      },
      consoleMessage: '[Supabase] Slow write detected: slowOp took 2500ms',
    });
  });

  it('honors a custom threshold', () => {
    expect(detectSlowWrite('op', 500, 1000)).toBeNull();
    expect(detectSlowWrite('op', 500, 500)).not.toBeNull();
  });
});

describe('isNetworkError', () => {
  it('returns true for "Load failed" with empty code', () => {
    expect(isNetworkError({ message: 'TypeError: Load failed', code: '', details: '', hint: '' } as PostgrestError)).toBe(true);
  });

  it('returns true for "Failed to fetch" with empty code', () => {
    expect(isNetworkError({ message: 'TypeError: Failed to fetch', code: '', details: '', hint: '' } as PostgrestError)).toBe(true);
  });

  it('returns true for "NetworkError" with empty code', () => {
    expect(isNetworkError({ message: 'NetworkError when attempting to fetch resource', code: '', details: '', hint: '' } as PostgrestError)).toBe(true);
  });

  it('returns false when error has a code', () => {
    expect(isNetworkError({ message: 'Load failed', code: '23505', details: '', hint: '' } as PostgrestError)).toBe(false);
  });

  it('returns false for non-network error messages', () => {
    expect(isNetworkError({ message: 'duplicate key violation', code: '', details: '', hint: '' } as PostgrestError)).toBe(false);
  });
});

describe('SupabaseNetworkError', () => {
  it('message does not contain "write"', () => {
    const error = new SupabaseNetworkError({ message: 'Load failed', code: '', details: '', hint: '' } as PostgrestError);
    expect(error.message).not.toContain('write');
  });

  it('message contains the original error message', () => {
    const error = new SupabaseNetworkError({ message: 'Load failed', code: '', details: '', hint: '' } as PostgrestError);
    expect(error.message).toContain('Load failed');
    expect(error.message).toContain('Supabase network error');
  });
});
