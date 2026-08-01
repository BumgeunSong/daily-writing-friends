import { describe, expect, it } from 'vitest';

import { mapToPostDateRows } from './stats.api';

describe('mapToPostDateRows', () => {
  it('keeps rows where both author and date are present', () => {
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

  it('drops rows with a null author or null date so they never corrupt streaks', () => {
    expect(
      mapToPostDateRows([
        { author_id: 'u1', created_at: '2026-01-01T00:00:00Z' },
        { author_id: null, created_at: '2026-01-02T00:00:00Z' },
        { author_id: 'u3', created_at: null },
        { author_id: null, created_at: null },
      ]),
    ).toEqual([{ author_id: 'u1', created_at: '2026-01-01T00:00:00Z' }]);
  });

  it('returns an empty array for no rows', () => {
    expect(mapToPostDateRows([])).toEqual([]);
  });
});
