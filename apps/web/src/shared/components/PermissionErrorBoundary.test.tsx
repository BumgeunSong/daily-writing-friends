import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { SESSION_KEYS, STORAGE_KEYS } from '@/shared/lib/storage';
import { PermissionErrorBoundary } from './PermissionErrorBoundary';

/**
 * 이 화면이 막는 것은 무한 왕복이다. 홈 탭의 목적지 `/boards`는 두 저장소를 참고하는데,
 * 볼 수 없게 된 게시판을 가리키는 기억이 하나라도 남으면 나가기를 눌러도 곧장 이 화면으로
 * 되돌아온다. 사용자는 빠져나갈 방법이 없다.
 *
 * 그래서 여기서 확인하는 것은 화면 생김새가 아니라 두 저장소가 모두 비워지는지다.
 */
const BOARD_ID = 'board-28';

function BoardsEntryStub() {
  return <h1>홈으로 이동</h1>;
}

function renderPermissionDenied() {
  const router = createMemoryRouter(
    [
      {
        path: '/board/:boardId',
        loader: () => {
          throw new Response('no read permission', { status: 403 });
        },
        element: <h1>게시판</h1>,
        errorElement: <PermissionErrorBoundary />,
      },
      { path: '/boards', element: <BoardsEntryStub /> },
    ],
    { initialEntries: [`/board/${BOARD_ID}`] },
  );

  render(<RouterProvider router={router} />);
}

describe('참여하지 않은 기수라 읽기 권한이 없을 때', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('나가기를 누르면 그 게시판을 가리키던 기억이 모두 사라진다', async () => {
    window.localStorage.setItem(STORAGE_KEYS.BOARD_ID, JSON.stringify({
      boardId: BOARD_ID,
      expiresAt: '2099-12-31T14:59:59.999Z',
    }));
    window.sessionStorage.setItem(SESSION_KEYS.VIEWING_BOARD_ID, BOARD_ID);

    renderPermissionDenied();

    fireEvent.click(await screen.findByRole('button', { name: '내 게시판으로 가기' }));

    expect(window.localStorage.getItem(STORAGE_KEYS.BOARD_ID)).toBeNull();
    expect(window.sessionStorage.getItem(SESSION_KEYS.VIEWING_BOARD_ID)).toBeNull();
  });

  it('나가기를 누르면 홈으로 빠져나온다', async () => {
    renderPermissionDenied();

    fireEvent.click(await screen.findByRole('button', { name: '내 게시판으로 가기' }));

    expect(await screen.findByRole('heading', { name: '홈으로 이동' })).toBeInTheDocument();
  });
});
