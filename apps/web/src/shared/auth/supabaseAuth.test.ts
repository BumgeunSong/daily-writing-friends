import { describe, it, expect } from 'vitest';
import { mapToAuthUser } from './supabaseAuth';

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
});
