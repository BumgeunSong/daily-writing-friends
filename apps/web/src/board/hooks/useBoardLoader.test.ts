import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/shared/hooks/useAuth';
import { queryClient } from '@/shared/lib/queryClient';
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

function resetSharedStateBetweenTests() {
  vi.clearAllMocks();
  queryClient.clear();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
}

describe('boardLoader caching contract', () => {
  beforeEach(() => {
    resetSharedStateBetweenTests();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reuses cached user data across repeat navigations', async () => {
    mockedGetCurrentUser.mockResolvedValue(mockUser);
    mockedFetchUser.mockResolvedValue({
      boardPermissions: {
        [boardId]: 'read',
      },
    } as unknown as Awaited<ReturnType<typeof fetchUser>>);

    await loadBoard();
    await loadBoard();

    expect(mockedFetchUser).toHaveBeenCalledTimes(1);
  });
});
