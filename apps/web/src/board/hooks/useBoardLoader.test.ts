import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/shared/hooks/useAuth';
import { queryClient } from '@/shared/lib/queryClient';
import { SESSION_KEYS, sessionStore } from '@/shared/lib/storage';
import { getCurrentUser } from '@/shared/utils/authUtils';
import { fetchUser } from '@/user/external/user.api';
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

vi.mock('@/user/external/user.api', () => ({
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

describe('참여하지 않은 기수의 게시판으로 들어온 유저', () => {
  beforeEach(() => {
    resetSharedStateBetweenTests();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('권한이 없으면 게시판 데이터를 받으면 안 된다', async () => {
    mockedGetCurrentUser.mockResolvedValue(mockUser);
    mockedFetchUser.mockResolvedValue({
      boardPermissions: { 'other-board': 'read' },
    } as unknown as Awaited<ReturnType<typeof fetchUser>>);

    const thrown = await loadBoard().catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(403);
  });

  it('권한 목록이 비어 있어도 게시판 데이터를 받으면 안 된다', async () => {
    mockedGetCurrentUser.mockResolvedValue(mockUser);
    mockedFetchUser.mockResolvedValue({
      boardPermissions: {},
    } as unknown as Awaited<ReturnType<typeof fetchUser>>);

    const thrown = await loadBoard().catch((error: unknown) => error);

    expect((thrown as Response).status).toBe(403);
  });
});

describe('세션이 없는 상태로 게시판 URL에 들어온 방문자', () => {
  beforeEach(() => {
    resetSharedStateBetweenTests();
    sessionStore.remove(SESSION_KEYS.RETURN_TO);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('권한 검사를 건너뛴 채 게시판이 열리면 안 된다', async () => {
    mockedGetCurrentUser.mockResolvedValue(null);

    const thrown = await loadBoard().catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get('Location')).toBe('/login');
    expect(mockedFetchUser).not.toHaveBeenCalled();
  });

  it('로그인 후 돌아올 게시판 경로를 기억한다', async () => {
    mockedGetCurrentUser.mockResolvedValue(null);

    await loadBoard().catch(() => undefined);

    expect(sessionStore.get(SESSION_KEYS.RETURN_TO)).toBe(`/board/${boardId}`);
  });
});
