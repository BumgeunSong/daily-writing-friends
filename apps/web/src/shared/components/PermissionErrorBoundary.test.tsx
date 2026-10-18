import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import RecentBoard from '@/board/components/RecentBoard';
import { SESSION_KEYS, STORAGE_KEYS } from '@/shared/lib/storage';
import { PermissionErrorBoundary } from './PermissionErrorBoundary';

/**
 * 이 화면이 막는 것은 빠져나갈 수 없는 고리다. 오류에서 나가는 버튼이 `/boards`로 가면,
 * 그 경로는 기억을 보고 방금 실패한 게시판으로 되돌려보낸다. 로더가 또 실패하면 사용자는
 * 같은 화면에 갇힌다.
 *
 * 그래서 `/boards`를 스텁이 아니라 진짜 `RecentBoard`로 둔다. 목적지 경로를 문자열로
 * 비교하면 되돌아오는지를 못 본다. 고리가 있으면 이 테스트 안에서 실제로 재현되어야 한다.
 */
const BOARD_ID = 'board-28';
const USER_ID = '11111111-1111-1111-1111-111111111111';

function BoardListStub() {
  return <h1>게시판 목록</h1>;
}

function loginAs(userId: string): void {
  window.localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({
    uid: userId,
    email: null,
    displayName: null,
    photoURL: null,
  }));
}

function viewBoardInThisSession(boardId: string): void {
  window.sessionStorage.setItem(
    SESSION_KEYS.VIEWING_BOARD_ID,
    JSON.stringify({ userId: USER_ID, boardId }),
  );
}

function enterFailingBoard(status: number) {
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      {
        path: '/board/:boardId',
        loader: () => {
          throw new Response('board load failed', { status });
        },
        element: <h1>게시판 본문</h1>,
        errorElement: <PermissionErrorBoundary />,
      },
      { path: '/boards', element: <RecentBoard /> },
      { path: '/boards/list', element: <BoardListStub /> },
    ],
    { initialEntries: [`/board/${BOARD_ID}`] },
  );

  render(<RouterProvider router={router} />);
  return user;
}

describe('참여하지 않은 기수라 읽기 권한이 없을 때', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    loginAs(USER_ID);
  });

  it('나가기를 누르면 그 게시판을 가리키던 기억이 모두 사라진다', async () => {
    window.localStorage.setItem(STORAGE_KEYS.BOARD_ID, JSON.stringify({
      boardId: BOARD_ID,
      expiresAt: '2099-12-31T14:59:59.999Z',
    }));
    viewBoardInThisSession(BOARD_ID);

    const user = enterFailingBoard(403);

    await user.click(await screen.findByRole('button', { name: '내 게시판으로 가기' }));

    expect(window.localStorage.getItem(STORAGE_KEYS.BOARD_ID)).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_KEYS.VIEWING_BOARD_ID)).toBeNull();
  });

  it('나가기를 누르면 게시판 목록으로 빠져나온다', async () => {
    viewBoardInThisSession(BOARD_ID);

    const user = enterFailingBoard(403);

    await user.click(await screen.findByRole('button', { name: '내 게시판으로 가기' }));

    expect(await screen.findByRole('heading', { name: '게시판 목록' })).toBeInTheDocument();
  });
});

describe('네트워크 오류로 게시판을 불러오지 못했을 때', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    loginAs(USER_ID);
  });

  // 읽던 게시판을 새로고침하다 네트워크가 끊긴 상황이다. 세션 기억에는 그 게시판이
  // 남아 있으므로, 나가기가 `/boards`를 거치면 곧장 같은 오류로 되돌아온다.
  it('홈으로를 누르면 실패한 게시판으로 되돌아가지 않는다', async () => {
    viewBoardInThisSession(BOARD_ID);

    const user = enterFailingBoard(503);

    await user.click(await screen.findByRole('button', { name: '홈으로' }));

    expect(await screen.findByRole('heading', { name: '게시판 목록' })).toBeInTheDocument();
  });

  // 네트워크 오류는 일시적이라 그 게시판이 나빠진 게 아니다. 기수 기록까지 지우면
  // 연결이 돌아온 뒤에도 사용자가 자기 기수를 다시 골라야 한다.
  it('일시적 오류이므로 기수 기록을 지우지는 않는다', async () => {
    const cohortRecord = JSON.stringify({
      boardId: BOARD_ID,
      expiresAt: '2099-12-31T14:59:59.999Z',
    });
    window.localStorage.setItem(STORAGE_KEYS.BOARD_ID, cohortRecord);
    viewBoardInThisSession(BOARD_ID);

    const user = enterFailingBoard(503);

    await user.click(await screen.findByRole('button', { name: '홈으로' }));

    await screen.findByRole('heading', { name: '게시판 목록' });
    expect(window.localStorage.getItem(STORAGE_KEYS.BOARD_ID)).toBe(cohortRecord);
  });
});
