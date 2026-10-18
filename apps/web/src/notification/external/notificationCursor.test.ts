import { describe, it, expect } from 'vitest';

import { buildKeysetOrFilter, deriveNextCursor } from './notificationCursor';

describe('buildKeysetOrFilter', () => {
  it('encodes a keyset predicate that breaks created_at ties by id', () => {
    const filter = buildKeysetOrFilter({
      createdAt: '2026-01-15T09:00:00.123456+00:00',
      id: '2847f88c-9f81-4863-9d42-94bcd56ed42a',
    });

    // rows strictly older than the cursor under (created_at DESC, id DESC):
    //   created_at < X  OR  (created_at = X AND id < Y)
    expect(filter).toBe(
      'created_at.lt."2026-01-15T09:00:00.123456+00:00",' +
        'and(created_at.eq."2026-01-15T09:00:00.123456+00:00",id.lt."2847f88c-9f81-4863-9d42-94bcd56ed42a")',
    );
  });

  it('double-quotes values so reserved characters cannot break the filter', () => {
    const filter = buildKeysetOrFilter({ createdAt: '2026-01-15T09:00:00Z', id: 'abc' });
    expect(filter).toContain('created_at.lt."2026-01-15T09:00:00Z"');
    expect(filter).toContain('id.lt."abc"');
  });
});

describe('deriveNextCursor', () => {
  const rows = [
    { created_at: '2026-01-15T09:00:00.500000+00:00', id: 'id-1' },
    { created_at: '2026-01-15T09:00:00.123456+00:00', id: 'id-2' },
  ];

  it('returns the last row as a full-precision cursor when the page is full', () => {
    expect(deriveNextCursor(rows, 2)).toEqual({
      createdAt: '2026-01-15T09:00:00.123456+00:00',
      id: 'id-2',
    });
  });

  it('preserves microsecond precision from the raw row (no Date truncation)', () => {
    const cursor = deriveNextCursor(rows, 2);
    expect(cursor?.createdAt).toBe('2026-01-15T09:00:00.123456+00:00');
  });

  it('returns null on a partial final page so pagination stops without an extra fetch', () => {
    expect(deriveNextCursor(rows, 10)).toBeNull();
  });

  it('returns null for an empty page', () => {
    expect(deriveNextCursor([], 10)).toBeNull();
  });
});
