import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';
import React from 'react';
import type { User } from '@/user/model/User';

// Mock dependencies before imports
vi.mock('@/shared/contexts/RemoteConfigContext', () => ({
  useRemoteConfig: vi.fn(() => ({ value: 'v1' })),
}));

vi.mock('@/user/api/user', () => ({
  fetchUser: vi.fn(),
}));

vi.mock('@/user/cache/userCache', () => ({
  getCachedUserData: vi.fn(),
  cacheUserData: vi.fn(),
}));

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}));

// Import after mocks
import { useUser } from '../useUser';
import { useRemoteConfig } from '@/shared/contexts/RemoteConfigContext';
import { fetchUser } from '@/user/api/user';
import { getCachedUserData, cacheUserData } from '@/user/cache/userCache';
import * as Sentry from '@sentry/react';

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

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useUser', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    vi.mocked(useRemoteConfig).mockReturnValue({ value: 'v1' });
    vi.mocked(getCachedUserData).mockReturnValue(null);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('when uid is null or undefined', () => {
    it('returns error when uid is null', () => {
      const { result } = renderHook(() => useUser(null), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe(
        '유저 ID가 존재하지 않아 유저 데이터를 불러올 수 없습니다.'
      );
      // Query is disabled, so data is null (initial cache returns null)
      expect(result.current.userData).toBeNull();
      expect(fetchUser).not.toHaveBeenCalled();
    });

    it('returns error when uid is undefined', () => {
      const { result } = renderHook(() => useUser(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.error).toBeInstanceOf(Error);
      // Query is disabled, so data is null (initial cache returns null)
      expect(result.current.userData).toBeNull();
      expect(fetchUser).not.toHaveBeenCalled();
    });
  });

  describe('when uid is provided', () => {
    it('fetches user data and caches it', async () => {
      const mockUser = createMockUser();
      vi.mocked(fetchUser).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useUser('test-uid'), {
        wrapper: createWrapper(queryClient),
      });

      // Wait for data to be fetched
      await waitFor(() => {
        expect(result.current.userData).not.toBeNull();
      });

      expect(fetchUser).toHaveBeenCalledWith('test-uid');
      expect(cacheUserData).toHaveBeenCalledWith('test-uid', mockUser, 'v1');
      expect(result.current.userData).toEqual(mockUser);
      expect(result.current.error).toBeNull();
    });

    it('uses cached data as initial data', async () => {
      const cachedUser = createMockUser({ nickname: 'cached-user' });
      vi.mocked(getCachedUserData).mockReturnValue(cachedUser);
      vi.mocked(fetchUser).mockResolvedValue(cachedUser);

      const { result } = renderHook(() => useUser('test-uid'), {
        wrapper: createWrapper(queryClient),
      });

      // Initial data should be available immediately
      expect(result.current.userData).toEqual(cachedUser);
      expect(getCachedUserData).toHaveBeenCalledWith('test-uid', 'v1');
    });

    it('returns null when user not found', async () => {
      vi.mocked(fetchUser).mockResolvedValue(null);

      const { result } = renderHook(() => useUser('nonexistent-uid'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.userData).toBeNull();
      expect(cacheUserData).not.toHaveBeenCalled();
    });

    it('handles fetch error and reports to Sentry', async () => {
      const error = new Error('Firestore error');
      vi.mocked(fetchUser).mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useUser('test-uid'), {
        wrapper: createWrapper(queryClient),
      });

      // Wait for error to be captured
      await waitFor(() => {
        expect(Sentry.captureException).toHaveBeenCalled();
      });

      expect(Sentry.captureException).toHaveBeenCalledWith(error);
      // The onError callback is called, but error in the result depends on React Query's error handling
      consoleSpy.mockRestore();
    });
  });

  describe('cache version handling', () => {
    it('uses cache version from remote config', async () => {
      vi.mocked(useRemoteConfig).mockReturnValue({ value: 'v2' });
      vi.mocked(fetchUser).mockResolvedValue(createMockUser());

      renderHook(() => useUser('test-uid'), {
        wrapper: createWrapper(queryClient),
      });

      expect(getCachedUserData).toHaveBeenCalledWith('test-uid', 'v2');
    });

    it('uses empty string when cache version is null', async () => {
      vi.mocked(useRemoteConfig).mockReturnValue({ value: null });
      vi.mocked(fetchUser).mockResolvedValue(createMockUser());

      renderHook(() => useUser('test-uid'), {
        wrapper: createWrapper(queryClient),
      });

      expect(getCachedUserData).toHaveBeenCalledWith('test-uid', '');
    });
  });

  describe('query key', () => {
    it('includes uid and cacheVersion in query key', async () => {
      vi.mocked(useRemoteConfig).mockReturnValue({ value: 'v1' });
      vi.mocked(fetchUser).mockResolvedValue(createMockUser());

      renderHook(() => useUser('test-uid'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        const queryState = queryClient.getQueryState(['user', 'test-uid', 'v1']);
        expect(queryState).toBeDefined();
      });
    });
  });
});
