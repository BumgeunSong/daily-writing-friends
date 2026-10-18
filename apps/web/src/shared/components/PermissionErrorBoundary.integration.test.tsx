import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS, storage } from '@/shared/lib/storage';
import { PermissionErrorBoundary } from './PermissionErrorBoundary';

const BOARD_CONTENT = '이번 주 글 목록';
const BOARD_LIST_CONTENT = '내 게시판 목록';

/**
 * Mirrors the `board/:boardId` route wiring: a loader that rejects with the
 * access-denial Response, and PermissionErrorBoundary as its errorElement.
 */
function renderDeniedBoardRoute(status: number) {
  const router = createMemoryRouter(
    [
      {
        path: '/board/:boardId',
        loader: () => {
          throw new Response('Access denied - insufficient board permissions', { status });
        },
        element: <div>{BOARD_CONTENT}</div>,
        errorElement: <PermissionErrorBoundary />,
      },
      { path: '/boards', element: <div>{BOARD_LIST_CONTENT}</div> },
    ],
    { initialEntries: ['/board/previous-cohort'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('참여하지 않은 기수의 게시판 URL로 들어온 유저', () => {
  beforeEach(() => {
    storage.set(STORAGE_KEYS.BOARD_ID, 'previous-cohort');
  });

  it('게시판 내용 대신 차단 화면을 봐야 한다', async () => {
    renderDeniedBoardRoute(403);

    expect(
      await screen.findByRole('heading', { name: '아직 참여하지 않은 기수예요' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(BOARD_CONTENT)).not.toBeInTheDocument();
  });

  it('왜 막혔는지와 다음에 무엇이 일어나는지 알 수 있다', async () => {
    renderDeniedBoardRoute(403);

    expect(await screen.findByText(/참여한 분들만 읽을 수 있어요/)).toBeInTheDocument();
    expect(screen.getByText(/시작하기 하루 전에 따로 연락드릴게요/)).toBeInTheDocument();
  });

  it('차단 화면에서 자기 게시판 목록으로 빠져나간다', async () => {
    const user = userEvent.setup();
    renderDeniedBoardRoute(403);

    await user.click(await screen.findByRole('button', { name: '내 게시판으로 가기' }));

    expect(await screen.findByText(BOARD_LIST_CONTENT)).toBeInTheDocument();
  });

  it('막힌 게시판이 저장된 최근 게시판으로 남아 다시 튕겨 들어가면 안 된다', async () => {
    const user = userEvent.setup();
    renderDeniedBoardRoute(403);

    await user.click(await screen.findByRole('button', { name: '내 게시판으로 가기' }));

    expect(storage.get(STORAGE_KEYS.BOARD_ID)).toBeNull();
  });
});
