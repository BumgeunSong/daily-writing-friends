import { describe, expect, it } from 'vitest';

import { groupWaitingUserIdsByBoard, mapToBoard } from './board.api';

describe('대기자 로우를 보드별로 묶을 때', () => {
  it('같은 보드의 대기자들을 입력 순서대로 모은다', () => {
    expect(
      groupWaitingUserIdsByBoard([
        { board_id: 'b1', user_id: 'u1' },
        { board_id: 'b2', user_id: 'u3' },
        { board_id: 'b1', user_id: 'u2' },
      ]),
    ).toEqual({ b1: ['u1', 'u2'], b2: ['u3'] });
  });

  it('로우가 없으면 빈 인덱스를 반환한다', () => {
    expect(groupWaitingUserIdsByBoard([])).toEqual({});
  });
});

describe('보드 로우를 도메인 모델로 매핑할 때', () => {
  it('값이 모두 있는 로우는 대기자와 날짜를 그대로 보존한다', () => {
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

  it('널 컬럼은 모두 도메인 부재값으로 접힌다', () => {
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
