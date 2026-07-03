import { describe, it, expect } from 'vitest';
import { parseStoredAuthUser } from '@/shared/utils/authUserParser';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

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

  it('returns null for Firebase UID (not a UUID)', () => {
    expect(parseStoredAuthUser('{"uid":"1y06BmkauwhIEwZm9LQmEmgl6Al1"}')).toBeNull();
  });

  it('returns null for short non-UUID string', () => {
    expect(parseStoredAuthUser('{"uid":"abc-123"}')).toBeNull();
  });

  it('parses valid AuthUser with UUID uid', () => {
    const stored = JSON.stringify({
      uid: VALID_UUID,
      email: 'test@example.com',
      displayName: 'Test',
      photoURL: 'https://photo.jpg',
    });
    expect(parseStoredAuthUser(stored)).toEqual({
      uid: VALID_UUID,
      email: 'test@example.com',
      displayName: 'Test',
      photoURL: 'https://photo.jpg',
    });
  });

  it('parses AuthUser with only uid', () => {
    const stored = JSON.stringify({ uid: VALID_UUID });
    const result = parseStoredAuthUser(stored);
    expect(result).not.toBeNull();
    expect(result!.uid).toBe(VALID_UUID);
  });
});
