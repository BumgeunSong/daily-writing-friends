import { describe, expect, it } from 'vitest';

import { groupWaitingUserIdsByBoard, mapToBoard } from './board.api';

describe('groupWaitingUserIdsByBoard', () => {
  it('collects each board\'s user ids in order under its board id', () => {
    expect(
      groupWaitingUserIdsByBoard([
        { board_id: 'b1', user_id: 'u1' },
        { board_id: 'b2', user_id: 'u3' },
        { board_id: 'b1', user_id: 'u2' },
      ]),
    ).toEqual({ b1: ['u1', 'u2'], b2: ['u3'] });
  });

  it('returns an empty index for no rows', () => {
    expect(groupWaitingUserIdsByBoard([])).toEqual({});
  });
});

describe('mapToBoard', () => {
  it('maps a fully-populated row, keeping the waiting list and dates', () => {
    const board = mapToBoard(
      {
        id: 'b1', title: '4기 글쓰기', description: '함께 씁니다',
        first_day: '2026-01-05', last_day: '2026-02-02', cohort: 4,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      ['u1', 'u2'],
    );

    expect(board).toMatchObject({ id: 'b1', title: '4기 글쓰기', description: '함께 씁니다', cohort: 4, waitingUsersIds: ['u1', 'u2'] });
    expect(board.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(board.firstDay?.toDate().toISOString()).toBe('2026-01-05T00:00:00.000Z');
    expect(board.lastDay?.toDate().toISOString()).toBe('2026-02-02T00:00:00.000Z');
  });

  it('collapses every nullable column to its domain absence value', () => {
    const board = mapToBoard(
      {
        id: 'b1', title: 'T', description: null,
        first_day: null, last_day: null, cohort: null,
        created_at: '2026-01-01T00:00:00.000Z',
      },
      [],
    );

    expect(board.description).toBe('');
    expect(board.firstDay).toBeUndefined();
    expect(board.lastDay).toBeUndefined();
    expect(board.cohort).toBeUndefined();
    expect(board.waitingUsersIds).toEqual([]);
  });
});
