import { describe, expect, it } from 'vitest';

import { mapToDonatorUserIds } from './donator.api';

describe('mapToDonatorUserIds', () => {
  it('projects rows to their user ids', () => {
    expect(mapToDonatorUserIds([{ user_id: 'u1' }, { user_id: 'u2' }])).toEqual(['u1', 'u2']);
  });

  it('drops rows whose user_id is null so they never enter the donator set', () => {
    expect(mapToDonatorUserIds([{ user_id: 'u1' }, { user_id: null }, { user_id: 'u2' }])).toEqual([
      'u1',
      'u2',
    ]);
  });

  it('returns an empty array for no rows', () => {
    expect(mapToDonatorUserIds([])).toEqual([]);
  });
});
