import { describe, it, expect } from 'vitest';
import { getUserDisplayName } from './userUtils';
import type { User } from '@/user/model/User';

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'test-user-id',
    realName: 'Test User',
    nickname: null,
    email: 'test@example.com',
    profilePhotoURL: null,
    bio: null,
    phoneNumber: null,
    referrer: null,
    boardPermissions: {},
    updatedAt: null,
    ...overrides,
  };
}

describe('userUtils', () => {
  describe('getUserDisplayName', () => {
    it('should return nickname when nickname is set', () => {
      const user = createMockUser({ nickname: 'CoolNickname', realName: 'Real Name' });
      expect(getUserDisplayName(user)).toBe('CoolNickname');
    });

    it('should return realName when nickname is null', () => {
      const user = createMockUser({ nickname: null, realName: 'Real Name' });
      expect(getUserDisplayName(user)).toBe('Real Name');
    });

    it('should return realName when nickname is empty string', () => {
      const user = createMockUser({ nickname: '', realName: 'Real Name' });
      expect(getUserDisplayName(user)).toBe('Real Name');
    });

    it('should return realName when nickname is whitespace only', () => {
      const user = createMockUser({ nickname: '   ', realName: 'Real Name' });
      expect(getUserDisplayName(user)).toBe('Real Name');
    });

    it('should return ?? when user is null', () => {
      expect(getUserDisplayName(null)).toBe('??');
    });

    it('should return ?? when user is undefined', () => {
      expect(getUserDisplayName(undefined)).toBe('??');
    });

    it('should return ?? when both nickname and realName are null', () => {
      const user = createMockUser({ nickname: null, realName: null });
      expect(getUserDisplayName(user)).toBe('??');
    });

    it('should return ?? when nickname is empty and realName is null', () => {
      const user = createMockUser({ nickname: '', realName: null });
      expect(getUserDisplayName(user)).toBe('??');
    });

    it('should return ?? when nickname is whitespace and realName is null', () => {
      const user = createMockUser({ nickname: '   ', realName: null });
      expect(getUserDisplayName(user)).toBe('??');
    });

    it('should prefer nickname over realName when both are set', () => {
      const user = createMockUser({ nickname: 'Nick', realName: 'Real' });
      expect(getUserDisplayName(user)).toBe('Nick');
    });

    // NOTE: Current behavior - function uses trim() to validate but returns untrimmed value.
    // This may be intentional (preserve formatting) or a bug (inconsistent with validation logic).
    it('should return untrimmed nickname when nickname has leading/trailing spaces', () => {
      const user = createMockUser({ nickname: '  Nickname  ', realName: 'Real Name' });
      expect(getUserDisplayName(user)).toBe('  Nickname  ');
    });
  });
});
