import { describe, it, expect } from 'vitest';
import { throwOnError, SupabaseWriteError } from './supabaseClient';

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
  it('does nothing when error is null', () => {
    expect(() => throwOnError({ error: null })).not.toThrow();
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
});
