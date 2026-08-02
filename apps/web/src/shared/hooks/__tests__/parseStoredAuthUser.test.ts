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

  // 저장된 AuthUser는 uid·email·displayName·photoURL을 모두 담으므로(useAuth 쓰기),
  // 일부만 있는 값은 손상된 것으로 보고 거부한다(재로그인 유도).
  it('returns null when required identity fields are missing', () => {
    const stored = JSON.stringify({ uid: VALID_UUID });
    expect(parseStoredAuthUser(stored)).toBeNull();
  });
});
