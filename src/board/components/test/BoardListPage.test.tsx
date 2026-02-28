// Always mock external dependencies before any imports!
vi.mock('@/firebase', () => ({
  remoteConfig: { settings: {}, defaultConfig: {} },
  auth: {
    currentUser: { uid: '123' },
    onAuthStateChanged: vi.fn(),
  },  
}));

vi.mock('@/shared/hooks/useRemoteConfig', () => ({
  useRemoteConfig: <T,>(key: string, defaultValue: T) => ({
    value: defaultValue,
    isLoading: false,
    error: null,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    refetch: async () => {},
  }),
}));

// Mocking unsupported dependencies
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  captureException: vi.fn(),
  withScope: vi.fn((cb: (scope: Record<string, unknown>) => void) => cb({ setContext: vi.fn(), setFingerprint: vi.fn() })),
  addBreadcrumb: vi.fn(),
}));

// react-router-dom: Link만 mock, 나머지는 실제 모듈 사용
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
  };
});

// useAuth만 mock, AuthProvider 등 나머지는 실제 export
vi.mock('@/shared/hooks/useAuth', async () => {
  const actual = await vi.importActual<typeof import('@/shared/hooks/useAuth')>('@/shared/hooks/useAuth');
  return {
    ...actual,
    useAuth: () => ({
      currentUser: { uid: '123' },
    }),
  };
});

// fetchBoardsWithUserPermissions 함수만 모킹
vi.mock('@/board/utils/boardUtils', () => ({
  fetchBoardsWithUserPermissions: vi.fn(),
}));


import type { Mock} from 'vitest';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import BoardListPage from '@/board/components/BoardListPage';
import { fetchBoardsWithUserPermissions } from '@/board/utils/boardUtils';
import { renderWithProviders } from '@/test/utils/renderWithProviders';
import type { Board } from '@/board/model/Board';


/**
 * 테스트 요약 및 설명
 * 1. Loading State Test: 데이터 패칭 중 로딩 메시지 노출 확인
 * 2. Error State Test: 데이터 패칭 실패 시 에러 메시지 노출 확인
 * 3. Empty State Test: 게시판이 없을 때 안내 메시지 노출 확인
 * 4. Boards List Test: 게시판 목록 정상 렌더링 확인
 * 5. Board Click Behavior Test: 게시판 클릭 시 localStorage 업데이트 확인
 *
 * - fetchBoardsWithUserPermissions만 모킹하여 공식 가이드에 맞게 테스트
 * - 비동기 데이터는 findByText 등 async matcher 사용
 * - 모든 타입 명시(TypeScript)
 * - 스타일/접근성 테스트는 제외
 */

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BoardListPage', () => {
  it('renders loading state', () => {
    const { getByText } = renderWithProviders(<BoardListPage />);
    expect(getByText(/게시판을 불러오는 중.../)).toBeInTheDocument();
    expect(fetchBoardsWithUserPermissions).toHaveBeenCalled();
  });

  it('renders error state', async () => {
    (fetchBoardsWithUserPermissions as unknown as Mock).mockImplementation(() => {
      return Promise.reject(new Error('Error fetching data'));
    });
    const { findByText } = renderWithProviders(<BoardListPage />);
    expect(await findByText(/게시판을 불러오는 중에 문제가 생겼어요/)).toBeInTheDocument();
    expect(fetchBoardsWithUserPermissions).toHaveBeenCalled();
  });

  it('renders empty state when no boards are available', async () => {
    (fetchBoardsWithUserPermissions as unknown as Mock).mockImplementation(() => Promise.resolve([]));
    const { findByText } = renderWithProviders(<BoardListPage />);
    expect(await findByText(/아직 초대받은 게시판이 없어요/)).toBeInTheDocument();
    expect(fetchBoardsWithUserPermissions).toHaveBeenCalled();
  });

  it('renders boards list when boards are present', async () => {
    const boardsMock: Board[] = [
      { id: '1', title: 'Board 1', description: 'First board', cohort: 1, createdAt: new Date(), waitingUsersIds: [] },
      { id: '2', title: 'Board 2', description: 'Second board', cohort: 2, createdAt: new Date(), waitingUsersIds: [] },
    ];
    (fetchBoardsWithUserPermissions as unknown as Mock).mockImplementation(() => Promise.resolve(boardsMock));
    const { findByText } = renderWithProviders(<BoardListPage />);
    expect(await findByText(/Board 1/)).toBeInTheDocument();
    expect(await findByText(/Board 2/)).toBeInTheDocument();
    expect(fetchBoardsWithUserPermissions).toHaveBeenCalled();
  });

  it('handles board click correctly', async () => {
    const boardsMock: Board[] = [
      { id: '1', title: 'Board 1', description: 'First board', cohort: 1, createdAt: new Date(), waitingUsersIds: [] },
    ];
    (fetchBoardsWithUserPermissions as unknown as Mock).mockImplementation(() => Promise.resolve(boardsMock));
    const { findByText } = renderWithProviders(<BoardListPage />);
    expect(fetchBoardsWithUserPermissions).toHaveBeenCalled();
    const boardLink = (await findByText(/Board 1/)).closest('a');
    boardLink && boardLink.click();
    expect(localStorage.getItem('boardId')).toBe('1');
  });
});
