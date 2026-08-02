import { describe, expect, it } from 'vitest';

import { mapToPostDateRows } from './stats.api';

describe('posts_feed 뷰의 게시 날짜 로우를 파싱할 때', () => {
  it('작성자와 날짜가 모두 있으면 그대로 유지한다', () => {
    expect(
      mapToPostDateRows([
        { author_id: 'u1', created_at: '2026-01-01T00:00:00Z' },
        { author_id: 'u2', created_at: '2026-01-02T00:00:00Z' },
      ]),
    ).toEqual([
      { author_id: 'u1', created_at: '2026-01-01T00:00:00Z' },
      { author_id: 'u2', created_at: '2026-01-02T00:00:00Z' },
    ]);
  });

  it('작성자나 날짜가 널이면 스트릭 오염을 막기 위해 버린다', () => {
    expect(
      mapToPostDateRows([
        { author_id: 'u1', created_at: '2026-01-01T00:00:00Z' },
        { author_id: null, created_at: '2026-01-02T00:00:00Z' },
        { author_id: 'u3', created_at: null },
        { author_id: null, created_at: null },
      ]),
    ).toEqual([{ author_id: 'u1', created_at: '2026-01-01T00:00:00Z' }]);
  });

  it('로우가 없으면 빈 배열을 반환한다', () => {
    expect(mapToPostDateRows([])).toEqual([]);
  });
});
