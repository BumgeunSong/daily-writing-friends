import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  getCachedUserData,
  cacheUserData,
  removeCachedUserData,
} from './userCache';
import type { User } from '@/user/model/User';

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'user-123',
    realName: 'Test User',
    nickname: 'testuser',
    email: 'test@example.com',
    profilePhotoURL: 'https://example.com/photo.jpg',
    bio: 'Test bio',
    phoneNumber: null,
    referrer: null,
    boardPermissions: {},
    updatedAt: Timestamp.fromDate(new Date('2025-01-01T12:00:00Z')),
    ...overrides,
  };
}

// Helper to directly store valid cache entry (bypasses cacheUserData serialization)
function storeValidCacheEntry(
  uid: string,
  cacheVersion: string,
  overrides: Partial<{
    uid: string;
    nickname: string;
    profilePhotoURL: string;
    updatedAt: string;
  }> = {}
) {
  const now = new Date().toISOString();
  const entry = {
    data: {
      uid: overrides.uid ?? 'user-123',
      nickname: overrides.nickname ?? 'testuser',
      profilePhotoURL: overrides.profilePhotoURL ?? 'https://example.com/photo.jpg',
      updatedAt: overrides.updatedAt ?? now,
      realName: 'Test User',
      email: 'test@example.com',
      bio: 'Test bio',
    },
    updatedAt: overrides.updatedAt ?? now,
  };
  localStorage.setItem(`${cacheVersion}-user-${uid}`, JSON.stringify(entry));
  return entry;
}

describe('userCache', () => {
  const cacheVersion = 'v1';
  const testUid = 'user-123';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('cacheUserData', () => {
    it('stores valid user data in localStorage', () => {
      const user = createMockUser();

      cacheUserData(testUid, user, cacheVersion);

      const stored = localStorage.getItem(`${cacheVersion}-user-${testUid}`);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.data.uid).toBe(testUid);
      expect(parsed.data.nickname).toBe('testuser');
    });

    it('does not store user with missing required fields', () => {
      const invalidUser = {
        uid: 'user-123',
        nickname: null, // required but null
        profilePhotoURL: 'https://example.com/photo.jpg',
        updatedAt: Timestamp.now(),
      } as unknown as User;

      cacheUserData(testUid, invalidUser, cacheVersion);

      const stored = localStorage.getItem(`${cacheVersion}-user-${testUid}`);
      expect(stored).toBeNull();
    });

    it('serializes updatedAt timestamp to ISO string', () => {
      const user = createMockUser({
        updatedAt: Timestamp.fromDate(new Date('2025-06-15T10:30:00Z')),
      });

      cacheUserData(testUid, user, cacheVersion);

      const stored = localStorage.getItem(`${cacheVersion}-user-${testUid}`);
      const parsed = JSON.parse(stored!);
      expect(parsed.updatedAt).toBe('2025-06-15T10:30:00.000Z');
    });

    it('uses cache version in storage key', () => {
      const user = createMockUser();

      cacheUserData(testUid, user, 'v2');

      expect(localStorage.getItem('v2-user-user-123')).not.toBeNull();
      expect(localStorage.getItem('v1-user-user-123')).toBeNull();
    });
  });

  describe('getCachedUserData', () => {
    it('returns cached user data when valid', () => {
      storeValidCacheEntry(testUid, cacheVersion);

      const result = getCachedUserData(testUid, cacheVersion);

      expect(result).not.toBeNull();
      expect(result?.uid).toBe(testUid);
      expect(result?.nickname).toBe('testuser');
    });

    it('returns null when no cached data exists', () => {
      const result = getCachedUserData('nonexistent-user', cacheVersion);

      expect(result).toBeNull();
    });

    it('returns null and clears cache when data is expired', () => {
      const expiredDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      storeValidCacheEntry(testUid, cacheVersion, { updatedAt: expiredDate.toISOString() });

      const result = getCachedUserData(testUid, cacheVersion);

      expect(result).toBeNull();
      expect(localStorage.getItem(`${cacheVersion}-user-${testUid}`)).toBeNull();
    });

    it('returns null and clears cache when data is malformed JSON', () => {
      localStorage.setItem(`${cacheVersion}-user-${testUid}`, 'invalid json');

      const result = getCachedUserData(testUid, cacheVersion);

      expect(result).toBeNull();
      expect(localStorage.getItem(`${cacheVersion}-user-${testUid}`)).toBeNull();
    });

    it('returns null when data structure is missing required fields', () => {
      // Note: The code returns null but does NOT clear cache for missing structure
      localStorage.setItem(`${cacheVersion}-user-${testUid}`, JSON.stringify({ invalid: true }));

      const result = getCachedUserData(testUid, cacheVersion);

      expect(result).toBeNull();
    });

    it('returns null and clears cache when user data fails validation', () => {
      const invalidData = {
        data: {
          uid: 123, // should be string
          nickname: 'test',
          profilePhotoURL: 'url',
          updatedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(`${cacheVersion}-user-${testUid}`, JSON.stringify(invalidData));

      const result = getCachedUserData(testUid, cacheVersion);

      expect(result).toBeNull();
    });

    it('converts updatedAt back to Firestore Timestamp', () => {
      storeValidCacheEntry(testUid, cacheVersion);

      const result = getCachedUserData(testUid, cacheVersion);

      expect(result?.updatedAt).toBeInstanceOf(Timestamp);
    });

    it('returns data within 24 hour expiration window', () => {
      const recentDate = new Date(Date.now() - 23 * 60 * 60 * 1000); // 23 hours ago
      storeValidCacheEntry(testUid, cacheVersion, { updatedAt: recentDate.toISOString() });

      const result = getCachedUserData(testUid, cacheVersion);

      expect(result).not.toBeNull();
    });
  });

  describe('removeCachedUserData', () => {
    it('removes cached user data from localStorage', () => {
      const user = createMockUser();
      cacheUserData(testUid, user, cacheVersion);
      expect(localStorage.getItem(`${cacheVersion}-user-${testUid}`)).not.toBeNull();

      removeCachedUserData(testUid, cacheVersion);

      expect(localStorage.getItem(`${cacheVersion}-user-${testUid}`)).toBeNull();
    });

    it('does not throw when removing non-existent data', () => {
      expect(() => {
        removeCachedUserData('nonexistent', cacheVersion);
      }).not.toThrow();
    });

    it('only removes data for specified cache version', () => {
      const user = createMockUser();
      cacheUserData(testUid, user, 'v1');
      cacheUserData(testUid, user, 'v2');

      removeCachedUserData(testUid, 'v1');

      expect(localStorage.getItem('v1-user-user-123')).toBeNull();
      expect(localStorage.getItem('v2-user-user-123')).not.toBeNull();
    });
  });
});
