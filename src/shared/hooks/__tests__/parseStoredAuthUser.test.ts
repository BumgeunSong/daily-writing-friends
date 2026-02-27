import { describe, it, expect } from 'vitest';
import { parseStoredAuthUser } from '../useAuth';

describe('parseStoredAuthUser', () => {
  it('returns null for null input', () => {
    expect(parseStoredAuthUser(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseStoredAuthUser('')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseStoredAuthUser('not json')).toBeNull();
  });

  it('returns null for JSON without uid', () => {
    expect(parseStoredAuthUser('{"email":"a@b.com"}')).toBeNull();
  });

  it('returns null for empty uid', () => {
    expect(parseStoredAuthUser('{"uid":""}')).toBeNull();
  });

  it('returns null for non-string uid', () => {
    expect(parseStoredAuthUser('{"uid":123}')).toBeNull();
  });

  it('parses valid AuthUser', () => {
    const stored = JSON.stringify({
      uid: 'abc-123',
      email: 'test@example.com',
      displayName: 'Test',
      photoURL: 'https://photo.jpg',
    });
    expect(parseStoredAuthUser(stored)).toEqual({
      uid: 'abc-123',
      email: 'test@example.com',
      displayName: 'Test',
      photoURL: 'https://photo.jpg',
    });
  });

  it('parses AuthUser with only uid', () => {
    const stored = JSON.stringify({ uid: 'abc-123' });
    const result = parseStoredAuthUser(stored);
    expect(result).not.toBeNull();
    expect(result!.uid).toBe('abc-123');
  });
});
