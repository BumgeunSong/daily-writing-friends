import { describe, it, expect, vi, beforeEach } from 'vitest';
import { throwOnError, executeTrackedWrite, SupabaseWriteError } from './supabaseClient';

vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  withScope: vi.fn((callback: (scope: unknown) => void) => {
    callback({
      setContext: vi.fn(),
      setFingerprint: vi.fn(),
    });
  }),
}));

import * as Sentry from '@sentry/react';

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
  });

  it('does nothing when error is null', () => {
    expect(() => throwOnError({ error: null })).not.toThrow();
    expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
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

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'supabase.write',
        level: 'error',
        message: 'Supabase write failed: createComment',
      }),
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(SupabaseWriteError));
  });

  it('uses generic breadcrumb message when operation is omitted', () => {
    const postgrestError = { message: 'fail', code: '500', details: '', hint: '' };

    expect(() => throwOnError({ error: postgrestError })).toThrow(SupabaseWriteError);

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Supabase write failed' }),
    );
  });
});

describe('executeTrackedWrite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the operation and resolves when there is no error', async () => {
    const fn = vi.fn().mockResolvedValue({ error: null });

    await expect(executeTrackedWrite('insertPost', fn)).resolves.toBeUndefined();
    expect(fn).toHaveBeenCalledOnce();
  });

  it('adds a start breadcrumb', async () => {
    const fn = vi.fn().mockResolvedValue({ error: null });

    await executeTrackedWrite('insertPost', fn);

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'supabase.write',
        level: 'info',
        message: 'Supabase write started: insertPost',
      }),
    );
  });

  it('throws SupabaseWriteError and reports to Sentry on operation error', async () => {
    const postgrestError = { message: 'conflict', code: '23505', details: '', hint: '' };
    const fn = vi.fn().mockResolvedValue({ error: postgrestError });

    await expect(executeTrackedWrite('insertPost', fn)).rejects.toBeInstanceOf(SupabaseWriteError);

    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(SupabaseWriteError));
  });

  it('adds slow-write warning breadcrumb and console.warn when operation exceeds threshold', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Simulate a slow operation by delaying 1100ms
    const fn = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 1100)),
    );

    await executeTrackedWrite('slowOp', fn);

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'supabase.write',
        level: 'warning',
        message: 'Slow Supabase write detected: slowOp',
      }),
    );
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Slow write detected: slowOp'));

    consoleSpy.mockRestore();
  }, 5000);
});
