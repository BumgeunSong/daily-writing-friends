import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SESSION_KEYS, STORAGE_KEYS } from '@/shared/lib/storage';
import { useRecordViewingBoard } from './useRecordViewingBoard';

const USER_ID = '11111111-1111-1111-1111-111111111111';

function recordedBoard(): { userId: string; boardId: string } | null {
  const raw = window.sessionStorage.getItem(SESSION_KEYS.VIEWING_BOARD_ID);
  return raw ? JSON.parse(raw) : null;
}

describe('게시판 화면이 떠 있는 동안', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({
      uid: USER_ID,
      email: null,
      displayName: null,
      photoURL: null,
    }));
  });

  it('보고 있는 게시판을 이번 세션 기억에 적는다', () => {
    renderHook(() => useRecordViewingBoard('board-29'));

    expect(recordedBoard()).toEqual({ userId: USER_ID, boardId: 'board-29' });
  });

  it('다른 게시판으로 옮겨가면 기억도 그 게시판으로 바뀐다', () => {
    const { rerender } = renderHook(({ boardId }) => useRecordViewingBoard(boardId), {
      initialProps: { boardId: 'board-28' as string | undefined },
    });

    rerender({ boardId: 'board-29' });

    expect(recordedBoard()).toEqual({ userId: USER_ID, boardId: 'board-29' });
  });

  // 경로에 게시판 id가 없으면 화면 자체가 오류 상태다. 그 상태를 기억해두면 홈 탭이
  // 갈 곳을 잃는다.
  it('게시판 id가 없으면 아무것도 적지 않는다', () => {
    renderHook(() => useRecordViewingBoard(undefined));

    expect(recordedBoard()).toBeNull();
  });

  it('id가 사라져도 직전에 적어둔 기억을 지우지는 않는다', () => {
    const { rerender } = renderHook(({ boardId }) => useRecordViewingBoard(boardId), {
      initialProps: { boardId: 'board-29' as string | undefined },
    });

    rerender({ boardId: undefined });

    expect(recordedBoard()).toEqual({ userId: USER_ID, boardId: 'board-29' });
  });

  it('로그인 사용자가 없으면 기록하지 않는다', () => {
    window.localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);

    renderHook(() => useRecordViewingBoard('board-29'));

    expect(recordedBoard()).toBeNull();
  });
});
