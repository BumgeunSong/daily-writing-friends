import { describe, it, expect } from 'vitest';
import type { Board } from '@/board/model/Board';
import { createTimestamp } from '@/shared/model/Timestamp';
import { resolveRecentBoardRedirect, serializeRecentBoard } from './recentBoardCache';

const NOW = new Date('2026-08-23T00:00:00.000Z');

function cacheValue(boardId: string, expiresAt: string): string {
  return JSON.stringify({ boardId, expiresAt });
}

function boardWith(lastDay: Date | undefined): Board {
  return {
    id: 'board-1',
    title: '매일 글쓰기 프렌즈 29기',
    description: '',
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    lastDay: lastDay ? createTimestamp(lastDay) : undefined,
    waitingUsersIds: [],
  };
}

describe('resolveRecentBoardRedirect', () => {
  it('sends a user with no cached board to the board list', () => {
    expect(resolveRecentBoardRedirect(null, NOW))
      .toEqual({ to: '/boards/list', clearCache: false });
  });

  it('clears a legacy bare-id value and sends the user to the board list', () => {
    expect(resolveRecentBoardRedirect('884afdbe-3620-415c-a8db-72d703e8df46', NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });

  it('clears a cache whose board has ended', () => {
    const ended = cacheValue('board-28', '2026-08-21T14:59:59.999Z');
    expect(resolveRecentBoardRedirect(ended, NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });

  it('redirects to a board that is still running', () => {
    const running = cacheValue('board-29', '2026-09-18T14:59:59.999Z');
    expect(resolveRecentBoardRedirect(running, NOW))
      .toEqual({ to: '/board/board-29', clearCache: false });
  });

  it('treats the last millisecond of the final day as still running', () => {
    const boundary = new Date('2026-08-21T14:59:59.999Z');
    expect(resolveRecentBoardRedirect(cacheValue('b', boundary.toISOString()), boundary))
      .toEqual({ to: '/board/b', clearCache: false });
  });

  it('expires one millisecond after the final day ends', () => {
    const boundary = new Date('2026-08-21T14:59:59.999Z');
    const justAfter = new Date(boundary.getTime() + 1);
    expect(resolveRecentBoardRedirect(cacheValue('b', boundary.toISOString()), justAfter))
      .toEqual({ to: '/boards/list', clearCache: true });
  });

  it('clears a cache with a malformed expiry', () => {
    expect(resolveRecentBoardRedirect(cacheValue('b', 'not-a-date'), NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });

  it('clears a cache with an empty board id', () => {
    expect(resolveRecentBoardRedirect(cacheValue('', '2026-09-18T14:59:59.999Z'), NOW))
      .toEqual({ to: '/boards/list', clearCache: true });
  });
});

describe('serializeRecentBoard', () => {
  it('stores the board id with its last day as the expiry', () => {
    const board = boardWith(new Date('2026-09-18T14:59:59.999Z'));
    expect(serializeRecentBoard(board))
      .toBe(JSON.stringify({ boardId: 'board-1', expiresAt: '2026-09-18T14:59:59.999Z' }));
  });

  it('refuses to cache a board with no end date', () => {
    expect(serializeRecentBoard(boardWith(undefined))).toBeNull();
  });
});
