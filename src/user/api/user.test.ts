import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase modules before imports
vi.mock('@/firebase', () => ({
  firestore: {},
  storage: {},
}));

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    doc: vi.fn(() => ({ path: 'users/test-uid' })),
    collection: vi.fn(() => ({ path: 'users' })),
    query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
    where: vi.fn((field, op, value) => ({ field, op, value })),
    or: vi.fn((...conditions) => ({ type: 'or', conditions })),
    orderBy: vi.fn((field, dir) => ({ field, dir })),
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => ({ fullPath: 'profilePhotos/test-uid' })),
  uploadBytes: vi.fn().mockResolvedValue({}),
  getDownloadURL: vi.fn().mockResolvedValue('https://storage.example.com/photo.jpg'),
}));

vi.mock('@/shared/api/trackedFirebase', () => ({
  trackedFirebase: {
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
  },
}));

// Import after mocks
import {
  fetchUser,
  createUser,
  updateUser,
  deleteUser,
  fetchUsersWithBoardPermission,
  uploadUserProfilePhoto,
  createUserIfNotExists,
  addBlockedUser,
  removeBlockedUser,
  fetchAllUsers,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getBlockedByUsers,
  buildNotInQuery,
} from './user';
import { trackedFirebase } from '@/shared/api/trackedFirebase';
import { doc, collection, writeBatch, query, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { User } from '@/user/model/User';

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    uid: 'test-uid',
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

describe('user API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchUser', () => {
    it('returns user data when document exists', async () => {
      const mockUser = createMockUser();
      vi.mocked(trackedFirebase.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockUser,
      } as any);

      const result = await fetchUser('test-uid');

      expect(doc).toHaveBeenCalledWith({}, 'users', 'test-uid');
      expect(result).toEqual(mockUser);
    });

    it('returns null when document does not exist', async () => {
      vi.mocked(trackedFirebase.getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      const result = await fetchUser('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('calls setDoc with user data and serverTimestamp', async () => {
      const mockUser = createMockUser();
      vi.mocked(trackedFirebase.setDoc).mockResolvedValue(undefined);

      await createUser(mockUser);

      expect(doc).toHaveBeenCalledWith({}, 'users', 'test-uid');
      expect(trackedFirebase.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...mockUser,
          updatedAt: 'SERVER_TIMESTAMP',
        })
      );
    });
  });

  describe('updateUser', () => {
    it('calls updateDoc with partial data and serverTimestamp', async () => {
      vi.mocked(trackedFirebase.updateDoc).mockResolvedValue(undefined);

      await updateUser('test-uid', { nickname: 'new-nickname' });

      expect(doc).toHaveBeenCalledWith({}, 'users', 'test-uid');
      expect(trackedFirebase.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          nickname: 'new-nickname',
          updatedAt: 'SERVER_TIMESTAMP',
        })
      );
    });
  });

  describe('deleteUser', () => {
    it('calls deleteDoc for user document', async () => {
      vi.mocked(trackedFirebase.deleteDoc).mockResolvedValue(undefined);

      await deleteUser('test-uid');

      expect(doc).toHaveBeenCalledWith({}, 'users', 'test-uid');
      expect(trackedFirebase.deleteDoc).toHaveBeenCalled();
    });
  });

  describe('fetchUsersWithBoardPermission', () => {
    it('returns empty array for empty boardIds', async () => {
      const result = await fetchUsersWithBoardPermission([]);

      expect(result).toEqual([]);
      expect(trackedFirebase.getDocs).not.toHaveBeenCalled();
    });

    it('returns users with matching board permissions', async () => {
      const mockUsers = [createMockUser({ uid: 'user-1' }), createMockUser({ uid: 'user-2' })];
      vi.mocked(trackedFirebase.getDocs).mockResolvedValue({
        docs: mockUsers.map((user) => ({
          id: user.uid,
          data: () => user,
        })),
      } as any);

      const result = await fetchUsersWithBoardPermission(['board-1', 'board-2']);

      expect(collection).toHaveBeenCalledWith({}, 'users');
      expect(result).toHaveLength(2);
      expect(result[0].uid).toBe('user-1');
      expect(result[1].uid).toBe('user-2');
    });

    it('returns empty array on error', async () => {
      vi.mocked(trackedFirebase.getDocs).mockRejectedValue(new Error('Firestore error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await fetchUsersWithBoardPermission(['board-1']);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('uploadUserProfilePhoto', () => {
    it('uploads file and returns download URL', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      const result = await uploadUserProfilePhoto('test-uid', mockFile);

      expect(ref).toHaveBeenCalledWith({}, 'profilePhotos/test-uid');
      expect(uploadBytes).toHaveBeenCalled();
      expect(getDownloadURL).toHaveBeenCalled();
      expect(result).toBe('https://storage.example.com/photo.jpg');
    });
  });

  describe('createUserIfNotExists', () => {
    it('creates user if not exists', async () => {
      vi.mocked(trackedFirebase.getDoc).mockResolvedValue({
        exists: () => false,
      } as any);
      vi.mocked(trackedFirebase.setDoc).mockResolvedValue(undefined);

      const firebaseUser = {
        uid: 'new-user',
        displayName: 'New User',
        email: 'new@example.com',
        photoURL: 'https://example.com/photo.jpg',
      } as any;

      await createUserIfNotExists(firebaseUser);

      expect(trackedFirebase.setDoc).toHaveBeenCalled();
    });

    it('does not create user if already exists', async () => {
      vi.mocked(trackedFirebase.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => createMockUser(),
      } as any);

      const firebaseUser = {
        uid: 'existing-user',
        displayName: 'Existing User',
        email: 'existing@example.com',
        photoURL: null,
      } as any;

      await createUserIfNotExists(firebaseUser);

      expect(trackedFirebase.setDoc).not.toHaveBeenCalled();
    });
  });

  describe('addBlockedUser', () => {
    it('adds blocker uid to blockedBy array', async () => {
      const blockedUser = createMockUser({ uid: 'blocked-uid', blockedBy: [] });
      vi.mocked(trackedFirebase.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => blockedUser,
      } as any);
      vi.mocked(trackedFirebase.updateDoc).mockResolvedValue(undefined);

      await addBlockedUser('blocker-uid', 'blocked-uid');

      expect(trackedFirebase.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          blockedBy: ['blocker-uid'],
        })
      );
    });

    it('does not duplicate if already blocked', async () => {
      const blockedUser = createMockUser({ uid: 'blocked-uid', blockedBy: ['blocker-uid'] });
      vi.mocked(trackedFirebase.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => blockedUser,
      } as any);

      await addBlockedUser('blocker-uid', 'blocked-uid');

      expect(trackedFirebase.updateDoc).not.toHaveBeenCalled();
    });

    it('throws error if user to block not found', async () => {
      vi.mocked(trackedFirebase.getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      await expect(addBlockedUser('blocker-uid', 'nonexistent')).rejects.toThrow(
        'User to be blocked not found'
      );
    });
  });

  describe('removeBlockedUser', () => {
    it('removes blocker uid from blockedBy array', async () => {
      const blockedUser = createMockUser({
        uid: 'blocked-uid',
        blockedBy: ['blocker-uid', 'other-uid'],
      });
      vi.mocked(trackedFirebase.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => blockedUser,
      } as any);
      vi.mocked(trackedFirebase.updateDoc).mockResolvedValue(undefined);

      await removeBlockedUser('blocker-uid', 'blocked-uid');

      expect(trackedFirebase.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          blockedBy: ['other-uid'],
        })
      );
    });

    it('does nothing if not in blockedBy array', async () => {
      const blockedUser = createMockUser({ uid: 'blocked-uid', blockedBy: [] });
      vi.mocked(trackedFirebase.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => blockedUser,
      } as any);

      await removeBlockedUser('blocker-uid', 'blocked-uid');

      expect(trackedFirebase.updateDoc).not.toHaveBeenCalled();
    });

    it('throws error if user not found', async () => {
      vi.mocked(trackedFirebase.getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      await expect(removeBlockedUser('blocker-uid', 'nonexistent')).rejects.toThrow(
        'User to be unblocked not found'
      );
    });
  });

  describe('fetchAllUsers', () => {
    it('returns all users', async () => {
      const mockUsers = [createMockUser({ uid: 'user-1' }), createMockUser({ uid: 'user-2' })];
      vi.mocked(trackedFirebase.getDocs).mockResolvedValue({
        docs: mockUsers.map((user) => ({
          data: () => user,
        })),
      } as any);

      const result = await fetchAllUsers();

      expect(collection).toHaveBeenCalledWith({}, 'users');
      expect(result).toHaveLength(2);
    });

    it('returns empty array on error', async () => {
      vi.mocked(trackedFirebase.getDocs).mockRejectedValue(new Error('Firestore error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await fetchAllUsers();

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('blockUser', () => {
    it('uses batch to set both blockedUsers and blockedByUsers', async () => {
      const mockBatch = {
        set: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(writeBatch).mockReturnValue(mockBatch as any);

      await blockUser('blocker-uid', 'blocked-uid');

      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('unblockUser', () => {
    it('uses batch to delete both blockedUsers and blockedByUsers', async () => {
      const mockBatch = {
        set: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(writeBatch).mockReturnValue(mockBatch as any);

      await unblockUser('blocker-uid', 'blocked-uid');

      expect(mockBatch.delete).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('getBlockedUsers', () => {
    it('returns list of blocked user ids', async () => {
      vi.mocked(trackedFirebase.getDocs).mockResolvedValue({
        docs: [{ id: 'blocked-1' }, { id: 'blocked-2' }],
      } as any);

      const result = await getBlockedUsers('user-id');

      expect(collection).toHaveBeenCalledWith({}, 'users/user-id/blockedUsers');
      expect(result).toEqual(['blocked-1', 'blocked-2']);
    });
  });

  describe('getBlockedByUsers', () => {
    it('returns list of users who blocked current user', async () => {
      vi.mocked(trackedFirebase.getDocs).mockResolvedValue({
        docs: [{ id: 'blocker-1' }, { id: 'blocker-2' }],
      } as any);

      const result = await getBlockedByUsers('user-id');

      expect(collection).toHaveBeenCalledWith({}, 'users/user-id/blockedByUsers');
      expect(result).toEqual(['blocker-1', 'blocker-2']);
    });
  });

  describe('buildNotInQuery', () => {
    it('returns base query when notInList is empty', () => {
      const mockRef = { path: 'test' } as any;

      const result = buildNotInQuery(mockRef, 'uid', []);

      expect(where).not.toHaveBeenCalled();
      expect(query).toHaveBeenCalled();
    });

    it('adds not-in constraint when notInList has items (≤10)', () => {
      const mockRef = { path: 'test' } as any;
      const notInList = ['uid-1', 'uid-2', 'uid-3'];

      buildNotInQuery(mockRef, 'uid', notInList);

      expect(where).toHaveBeenCalledWith('uid', 'not-in', notInList);
    });

    it('skips not-in constraint when notInList exceeds 10 items', () => {
      const mockRef = { path: 'test' } as any;
      const notInList = Array.from({ length: 11 }, (_, i) => `uid-${i}`);

      buildNotInQuery(mockRef, 'uid', notInList);

      expect(where).not.toHaveBeenCalled();
    });

    it('applies orderBy constraints', () => {
      const mockRef = { path: 'test' } as any;

      buildNotInQuery(mockRef, 'uid', ['uid-1'], ['createdAt', 'desc']);

      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });
  });
});
