import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostgrestError } from '@supabase/supabase-js';
import type { AuthUser } from '@/shared/hooks/useAuth';
import { SupabaseNetworkError } from '@/shared/api/supabaseClient';
import { getCurrentUser } from '@/shared/utils/authUtils';
import { fetchUser } from '@/user/api/user';
import { boardLoader } from './useBoardLoader';

vi.mock('@sentry/react', async () => {
  const actual = await vi.importActual('@sentry/react');
  return {
    ...actual,
    startSpan: vi.fn((_options, callback: () => unknown) => callback()),
  };
});

vi.mock('@/shared/utils/authUtils', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/user/api/user', () => ({
  fetchUser: vi.fn(),
}));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);
const mockedFetchUser = vi.mocked(fetchUser);

const boardId = 'board-1';
const loadBoard = () => boardLoader({ params: { boardId } } as never);

const mockUser: AuthUser = {
  uid: 'user-1',
  email: 'user@test.com',
  displayName: 'User',
  photoURL: null,
};

function setupBoardLoaderTest() {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
}

describe('boardLoader basic behavior', () => {
  beforeEach(() => {
    setupBoardLoaderTest();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 400 response when boardId is missing', async () => {
    await expect(boardLoader({ params: {} } as never)).rejects.toMatchObject({ status: 400 });
  });

  it('returns boardId when user is not authenticated', async () => {
    mockedGetCurrentUser.mockResolvedValue(null);

    await expect(loadBoard()).resolves.toEqual({
      boardId,
    });
  });

  it('throws 403 response when user data is missing', async () => {
    mockedGetCurrentUser.mockResolvedValue(mockUser);
    mockedFetchUser.mockResolvedValue(null);

    await expect(loadBoard()).rejects.toMatchObject({
      status: 403,
      statusText: '',
    });
  });
});

describe('boardLoader permission and network handling', () => {
  beforeEach(() => {
    setupBoardLoaderTest();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws 403 response when user has no board permission', async () => {
    mockedGetCurrentUser.mockResolvedValue(mockUser);
    mockedFetchUser.mockResolvedValue({
      boardPermissions: {},
    } as unknown as Awaited<ReturnType<typeof fetchUser>>);

    await expect(loadBoard()).rejects.toMatchObject({
      status: 403,
    });
  });

  it('throws 503 response when Supabase network error occurs', async () => {
    mockedGetCurrentUser.mockResolvedValue(mockUser);
    const postgrestError: PostgrestError = {
      message: 'Failed to fetch',
      code: '',
      details: '',
      hint: '',
      name: '',
    };
    mockedFetchUser.mockRejectedValue(new SupabaseNetworkError(postgrestError));

    await expect(loadBoard()).rejects.toMatchObject({
      status: 503,
    });
  });

  it('returns boardId when user has read permission', async () => {
    mockedGetCurrentUser.mockResolvedValue(mockUser);
    mockedFetchUser.mockResolvedValue({
      boardPermissions: {
        [boardId]: 'read',
      },
    } as unknown as Awaited<ReturnType<typeof fetchUser>>);

    await expect(loadBoard()).resolves.toEqual({
      boardId,
    });
  });
});
