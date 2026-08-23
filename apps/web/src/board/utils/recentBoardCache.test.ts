import { describe, it, expect } from 'vitest';
import type { Board } from '@/board/model/Board';
import { createTimestamp } from '@/shared/model/Timestamp';
import { resolveRecentBoardRedirect, serializeRecentBoard } from './recentBoardCache';

const NOW = new Date('2026-08-23T00:00:00.000Z');

function cacheValue(boardId: string, expiresAt: string): string {
  return JSON.stringify({ boardId, expiresAt });
}

function boardWith(lastDay: Date | undefined): Pick<Board, 'id' | 'lastDay'> {
  return {
    id: 'board-1',
    lastDay: lastDay ? createTimestamp(lastDay) : undefined,
  };
}

describe('재방문한 사용자를 어느 게시판으로 보낼지 정할 때', () => {
  it('캐시된 게시판이 없으면 게시판 목록으로 보낸다', () => {
    expect(resolveRecentBoardRedirect(null, NOW))
      .toEqual({ to: '/boards/list', clearCache: false });
  });

  it('이전 형식으로 저장된 평문 게시판 id는 지우고 게시판 목록으로 보낸다', () => {
    expect(resolveRecentBoardRedirect('884afdbe-3620-415c-a8db-72d703e8df46', NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });

  it('이미 종료된 기수 게시판으로 리다이렉트하면 안 된다', () => {
    const ended = cacheValue('board-28', '2026-08-21T14:59:59.999Z');
    expect(resolveRecentBoardRedirect(ended, NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });

  it('진행 중인 게시판이면 그 게시판으로 바로 보낸다', () => {
    const running = cacheValue('board-29', '2026-09-18T14:59:59.999Z');
    expect(resolveRecentBoardRedirect(running, NOW))
      .toEqual({ to: '/board/board-29', clearCache: false });
  });

  it('종료 시각의 마지막 밀리초까지는 진행 중으로 본다', () => {
    const boundary = new Date('2026-08-21T14:59:59.999Z');
    expect(resolveRecentBoardRedirect(cacheValue('b', boundary.toISOString()), boundary))
      .toEqual({ to: '/board/b', clearCache: false });
  });

  it('종료 시각을 1밀리초라도 넘기면 만료로 본다', () => {
    const boundary = new Date('2026-08-21T14:59:59.999Z');
    const justAfter = new Date(boundary.getTime() + 1);
    expect(resolveRecentBoardRedirect(cacheValue('b', boundary.toISOString()), justAfter))
      .toEqual({ to: '/boards/list', clearCache: true });
  });

  it('만료 시각이 깨져 있으면 캐시를 지우고 게시판 목록으로 보낸다', () => {
    expect(resolveRecentBoardRedirect(cacheValue('b', 'not-a-date'), NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });

  it('게시판 id가 비어 있으면 캐시를 지우고 게시판 목록으로 보낸다', () => {
    expect(resolveRecentBoardRedirect(cacheValue('', '2026-09-18T14:59:59.999Z'), NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });
});

describe('만료 시각이 스키마가 받는 형식을 벗어날 때', () => {
  // 판정 함수에는 방어 코드가 없고 스키마가 이 값들을 걸러주는 데 기대고 있다. zod가
  // 이들을 통과시키게 바뀌면 `new Date`가 조용히 다른 시각으로 밀어내서 종료된 게시판이
  // 살아 있는 것처럼 판정되므로, 그 회귀가 여기서 먼저 빨개져야 한다.
  //
  // 두 입력 모두 보정 결과가 NOW보다 미래여야 이 테스트가 제 일을 한다. 보정 결과가
  // 과거면 스키마가 뚫려도 어차피 만료로 떨어져 초록으로 남는다.
  it('존재하지 않는 달력 날짜는 만료로 처리한다', () => {
    // 11월 31일은 없다. 보정되면 2026-12-01, 즉 NOW 이후가 된다.
    expect(resolveRecentBoardRedirect(cacheValue('b', '2026-11-31T00:00:00.000Z'), NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });

  it('Z가 아닌 타임존 오프셋 표기는 만료로 처리한다', () => {
    expect(resolveRecentBoardRedirect(cacheValue('b', '2026-09-18T14:59:59.999+09:00'), NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });
});

describe('고른 게시판을 캐시에 적을 때', () => {
  it('게시판 id와 종료일을 만료 시각으로 함께 적는다', () => {
    const board = boardWith(new Date('2026-09-18T14:59:59.999Z'));
    expect(serializeRecentBoard(board))
      .toBe(JSON.stringify({ boardId: 'board-1', expiresAt: '2026-09-18T14:59:59.999Z' }));
  });

  it('종료일이 없는 게시판은 캐시하지 않는다', () => {
    expect(serializeRecentBoard(boardWith(undefined))).toBeNull();
  });
});

describe('캐시에 적은 값을 그대로 다시 읽을 때', () => {
  // 쓰기와 읽기가 같은 스키마를 공유하는지 확인한다. 스키마 키를 개명하면 두 쪽이
  // 조용히 어긋나고 모든 사용자가 게시판 목록으로 튕기는데, 한쪽만 보는 테스트는
  // 그걸 못 잡는다.
  it('진행 중인 게시판은 그 게시판으로 다시 돌아간다', () => {
    const cached = serializeRecentBoard(boardWith(new Date('2026-09-18T14:59:59.999Z')));
    expect(resolveRecentBoardRedirect(cached, NOW))
      .toEqual({ to: '/board/board-1', clearCache: false });
  });

  it('종료된 게시판은 만료로 판정되어 게시판 목록으로 돌아간다', () => {
    const cached = serializeRecentBoard(boardWith(new Date('2026-08-21T14:59:59.999Z')));
    expect(resolveRecentBoardRedirect(cached, NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });
});
