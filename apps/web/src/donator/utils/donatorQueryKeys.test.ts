import { describe, it, expect } from 'vitest';
import { buildDonatorQueryIds } from './donatorQueryKeys';

describe('buildDonatorQueryIds', () => {
  it('returns empty array when given no ids', () => {
    expect(buildDonatorQueryIds([])).toEqual([]);
  });

  it('removes duplicate ids', () => {
    expect(buildDonatorQueryIds(['a', 'b', 'a'])).toEqual(['a', 'b']);
  });

  it('returns ids in stable sorted order', () => {
    expect(buildDonatorQueryIds(['c', 'a', 'b'])).toEqual(['a', 'b', 'c']);
  });

  it('produces equal output for differently ordered inputs (queryKey stability)', () => {
    const a = buildDonatorQueryIds(['c', 'a', 'b']);
    const b = buildDonatorQueryIds(['b', 'c', 'a']);
    expect(a).toEqual(b);
  });

  it('treats duplicates and ordering together', () => {
    expect(buildDonatorQueryIds(['b', 'a', 'a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });
});
