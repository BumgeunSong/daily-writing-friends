import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { SESSION_KEYS, STORAGE_KEYS } from '@/shared/lib/storage';
import { useLocation, useParams } from '@/shared/navigation';
import RecentBoard from './RecentBoard';

/**
 * 판정 규칙은 recentBoardCache.test.ts가 덮는다. 여기가 막는 위험은 하나,
 * 저장소에서 라우터까지의 배선이다. 판정 결과가 실제 이동으로 이어지는지,
 * 두 저장소를 각각 제 자리에서 읽는지, 만료 판정이 실제로 키를 지우는지를
 * 화면에 보이는 것으로만 확인한다.
 *
 * 목적지는 스텁이다. 게시판 목록이 렌더되는지는 이 변경의 위험이 아니고,
 * 스텁을 쓰면 네트워크가 0이라 MSW 없이 unit 프로젝트에 둘 수 있다.
 */

// 만료 판정은 실제 시계를 쓴다. 과거/먼 미래 픽스처면 시계를 목킹할 필요가 없고,
// 목킹하지 않는 편이 컴포넌트가 넘기는 `new Date()`까지 실물로 지나간다.
const ENDED_BOARD_CACHE = JSON.stringify({
  boardId: 'board-28',
  expiresAt: '2020-01-01T00:00:00.000Z',
});

const RUNNING_BOARD_CACHE = JSON.stringify({
  boardId: 'board-29',
  expiresAt: '2099-12-31T14:59:59.999Z',
});

const PLAIN_BOARD_ID = '884afdbe-3620-415c-a8db-72d703e8df46';
const USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222';

function BoardListStub() {
  return <h1>게시판 목록</h1>;
}

function BoardStub() {
  const { boardId } = useParams();
  const location = useLocation();
  const restoreBoardScroll = (location.state as { restoreBoardScroll?: boolean } | null)?.restoreBoardScroll;
  return <h1>{`게시판 ${boardId}${restoreBoardScroll ? ' (restore)' : ''}`}</h1>;
}

function enterBoardsEntry() {
  const router = createMemoryRouter(
    [
      { path: '/boards', element: <RecentBoard /> },
      { path: '/boards/list', element: <BoardListStub /> },
      { path: '/board/:boardId', element: <BoardStub /> },
    ],
    { initialEntries: ['/boards'] },
  );

  render(<RouterProvider router={router} />);
}

function cachedBoardId(): string | null {
  return window.localStorage.getItem(STORAGE_KEYS.BOARD_ID);
}

function loginAs(userId: string): void {
  window.localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({
    uid: userId,
    email: null,
    displayName: null,
    photoURL: null,
  }));
}

function viewBoardInThisSession(boardId: string, userId = USER_ID): void {
  window.sessionStorage.setItem(SESSION_KEYS.VIEWING_BOARD_ID, JSON.stringify({ userId, boardId }));
}

describe('/boards로 재진입한 사용자', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('지난 기수 게시판이 캐시에 남아 있어도 그 게시판으로 들어가면 안 된다', async () => {
    window.localStorage.setItem(STORAGE_KEYS.BOARD_ID, ENDED_BOARD_CACHE);

    enterBoardsEntry();

    expect(await screen.findByRole('heading', { name: '게시판 목록' })).toBeInTheDocument();
    expect(cachedBoardId()).toBeNull();
  });

  it('이전 형식으로 저장된 평문 게시판 id는 지워지고 게시판 목록을 본다', async () => {
    window.localStorage.setItem(STORAGE_KEYS.BOARD_ID, PLAIN_BOARD_ID);

    enterBoardsEntry();

    expect(await screen.findByRole('heading', { name: '게시판 목록' })).toBeInTheDocument();
    expect(cachedBoardId()).toBeNull();
  });

  it('진행 중인 게시판이 캐시에 있으면 그 게시판으로 바로 들어가고 캐시는 남는다', async () => {
    window.localStorage.setItem(STORAGE_KEYS.BOARD_ID, RUNNING_BOARD_CACHE);

    enterBoardsEntry();

    expect(await screen.findByRole('heading')).toHaveTextContent('board-29');
    expect(cachedBoardId()).toBe(RUNNING_BOARD_CACHE);
  });

  it('캐시가 없으면 게시판 목록을 본다', async () => {
    enterBoardsEntry();

    expect(await screen.findByRole('heading', { name: '게시판 목록' })).toBeInTheDocument();
  });
});

describe('다른 탭에 갔다가 홈 탭으로 돌아온 사용자', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  // 이 테스트가 막는 회귀가 사용자가 겪은 증상 그 자체다. 종료된 기수를 읽던 중
  // 알림 탭에 다녀오면 게시판 목록으로 튕겨서, 탭만 옮겼는데 자리를 잃었다.
  it('읽던 기수가 이미 끝났어도 그 게시판으로 돌아온다', async () => {
    loginAs(USER_ID);
    viewBoardInThisSession('board-28');
    window.localStorage.setItem(STORAGE_KEYS.BOARD_ID, ENDED_BOARD_CACHE);

    enterBoardsEntry();

    expect(await screen.findByRole('heading')).toHaveTextContent('board-28 (restore)');
  });

  it('세션 기억이 만료된 저장 기록보다 앞선다', async () => {
    loginAs(USER_ID);
    viewBoardInThisSession('board-29');
    window.localStorage.setItem(STORAGE_KEYS.BOARD_ID, ENDED_BOARD_CACHE);

    enterBoardsEntry();

    expect(await screen.findByRole('heading')).toHaveTextContent('board-29');
  });

  // 세션 기억이 이겼다고 저장 기록까지 지우면, 앱을 새로 열었을 때 기수 롤오버가
  // 판정할 대상이 사라진다.
  it('세션 기억으로 이동해도 저장된 기록은 남긴다', async () => {
    loginAs(USER_ID);
    viewBoardInThisSession('board-28');
    window.localStorage.setItem(STORAGE_KEYS.BOARD_ID, ENDED_BOARD_CACHE);

    enterBoardsEntry();

    await screen.findByRole('heading');
    expect(cachedBoardId()).toBe(ENDED_BOARD_CACHE);
  });

  it('다른 사용자가 남긴 세션 기억은 무시한다', async () => {
    loginAs(USER_ID);
    viewBoardInThisSession('board-28', OTHER_USER_ID);
    window.localStorage.setItem(STORAGE_KEYS.BOARD_ID, RUNNING_BOARD_CACHE);

    enterBoardsEntry();

    expect(await screen.findByRole('heading')).toHaveTextContent('board-29');
  });
});
