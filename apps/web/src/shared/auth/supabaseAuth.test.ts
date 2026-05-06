import { describe, it, expect } from 'vitest';
import { classifySupabaseAuthError, mapToAuthUser } from './supabaseAuth';

describe('mapToAuthUser', () => {
  it('maps standard Supabase user to AuthUser', () => {
    const supabaseUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/photo.jpg',
      },
    };

    expect(mapToAuthUser(supabaseUser)).toEqual({
      uid: '550e8400-e29b-41d4-a716-446655440000',
      email: 'user@example.com',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg',
    });
  });

  it('maps uid from id field', () => {
    const user = { id: 'abc-123' };
    expect(mapToAuthUser(user).uid).toBe('abc-123');
  });

  it('returns null for missing email', () => {
    const user = { id: 'abc-123' };
    expect(mapToAuthUser(user).email).toBeNull();
  });

  it('returns null for undefined email', () => {
    const user = { id: 'abc-123', email: undefined };
    expect(mapToAuthUser(user).email).toBeNull();
  });

  it('returns null for missing user_metadata', () => {
    const user = { id: 'abc-123', email: 'a@b.com' };
    expect(mapToAuthUser(user).displayName).toBeNull();
    expect(mapToAuthUser(user).photoURL).toBeNull();
  });

  it('returns null for empty user_metadata', () => {
    const user = { id: 'abc-123', user_metadata: {} };
    expect(mapToAuthUser(user).displayName).toBeNull();
    expect(mapToAuthUser(user).photoURL).toBeNull();
  });

  it('handles user_metadata with only full_name', () => {
    const user = {
      id: 'abc-123',
      user_metadata: { full_name: 'Only Name' },
    };
    expect(mapToAuthUser(user).displayName).toBe('Only Name');
    expect(mapToAuthUser(user).photoURL).toBeNull();
  });

  it('handles user_metadata with only avatar_url', () => {
    const user = {
      id: 'abc-123',
      user_metadata: { avatar_url: 'https://photo.jpg' },
    };
    expect(mapToAuthUser(user).displayName).toBeNull();
    expect(mapToAuthUser(user).photoURL).toBe('https://photo.jpg');
  });

  it('returns null when full_name is not a string (e.g. number, object, null)', () => {
    const cases: Array<unknown> = [42, null, { nested: 'object' }, true, []];
    for (const value of cases) {
      const user = { id: 'abc-123', user_metadata: { full_name: value } };
      expect(mapToAuthUser(user).displayName).toBeNull();
    }
  });

  it('returns null when avatar_url is not a string', () => {
    const user = { id: 'abc-123', user_metadata: { avatar_url: 12345 } };
    expect(mapToAuthUser(user).photoURL).toBeNull();
  });

  it('returns null for empty-string full_name (treated as missing)', () => {
    const user = { id: 'abc-123', user_metadata: { full_name: '' } };
    expect(mapToAuthUser(user).displayName).toBeNull();
  });
});

describe('classifySupabaseAuthError', () => {
  it('classifies HTTP 429 as rate_limit', () => {
    expect(classifySupabaseAuthError({ status: 429, message: 'too many requests' })).toBe('rate_limit');
  });

  it('classifies over_email_send_rate_limit code as rate_limit', () => {
    expect(classifySupabaseAuthError({ status: 400, code: 'over_email_send_rate_limit', message: 'limit' })).toBe('rate_limit');
  });

  it('classifies over_request_rate_limit code as rate_limit', () => {
    expect(classifySupabaseAuthError({ status: 429, code: 'over_request_rate_limit' })).toBe('rate_limit');
  });

  it('classifies otp_expired code as invalid_or_expired (Supabase merges expired and invalid)', () => {
    expect(classifySupabaseAuthError({ status: 403, code: 'otp_expired', message: 'Token has expired or is invalid' })).toBe('invalid_or_expired');
  });

  it('classifies "expired" message as invalid_or_expired', () => {
    expect(classifySupabaseAuthError({ status: 400, message: 'Token has expired' })).toBe('invalid_or_expired');
  });

  it('classifies "invalid" message as invalid_or_expired', () => {
    expect(classifySupabaseAuthError({ status: 400, message: 'invalid token' })).toBe('invalid_or_expired');
  });

  it('falls back to unknown for everything else', () => {
    expect(classifySupabaseAuthError({ status: 500, message: 'server error' })).toBe('unknown');
    expect(classifySupabaseAuthError({})).toBe('unknown');
    expect(classifySupabaseAuthError(null)).toBe('unknown');
  });
});
