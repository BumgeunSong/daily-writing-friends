import { describe, expect, it } from 'vitest';
import { shouldFetchNextPage } from './shouldFetchNextPage';

describe('shouldFetchNextPage', () => {
  it('returns true when the sentinel is in view, more pages exist, and no fetch is in flight', () => {
    expect(
      shouldFetchNextPage({ inView: true, hasNextPage: true, isFetchingNextPage: false }),
    ).toBe(true);
  });

  it('returns false when the sentinel is not in view', () => {
    expect(
      shouldFetchNextPage({ inView: false, hasNextPage: true, isFetchingNextPage: false }),
    ).toBe(false);
  });

  it('returns false when there is no next page', () => {
    expect(
      shouldFetchNextPage({ inView: true, hasNextPage: false, isFetchingNextPage: false }),
    ).toBe(false);
  });

  it('returns false when hasNextPage is undefined (initial load)', () => {
    expect(
      shouldFetchNextPage({ inView: true, hasNextPage: undefined, isFetchingNextPage: false }),
    ).toBe(false);
  });

  it('returns false when a fetch is already in flight, to avoid duplicate requests', () => {
    expect(
      shouldFetchNextPage({ inView: true, hasNextPage: true, isFetchingNextPage: true }),
    ).toBe(false);
  });
});
