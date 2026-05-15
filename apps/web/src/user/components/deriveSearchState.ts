import type { Post } from '@/post/model/Post';
import { MIN_QUERY_LENGTH } from '@/user/search/constants';

export type SearchState = 'idle' | 'loading' | 'empty' | 'results' | 'error';

/**
 * Map (trimmed query, plain React Query result shape) → one of five UI states.
 *
 * Evaluation order is contractual (design D7): the idle gate runs before
 * we ever read `data`, so when the user clears the input the previous
 * `keepPreviousData` cache cannot leak into the idle prompt.
 */
export function deriveSearchState(
  query: string,
  result: { isFetching: boolean; isError: boolean; data?: Post[] },
): SearchState {
  if (query.length < MIN_QUERY_LENGTH) return 'idle';
  if (result.isError) return 'error';
  if (result.isFetching && !result.data) return 'loading';
  if (result.data?.length === 0) return 'empty';
  return 'results';
}
