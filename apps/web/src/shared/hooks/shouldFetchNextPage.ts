interface InfiniteFetchState {
  inView: boolean;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
}

/**
 * Decides whether the next page should be fetched right now, given the current
 * visibility/pagination state. Pure function: same input → same output, no
 * side effects.
 *
 * Used by `useInfiniteScroll` (web, IntersectionObserver-driven) and the
 * forthcoming RN equivalent (`FlatList.onEndReached`-driven). The web hook
 * sets `inView` from the observer; the RN hook sets it to `true` on every
 * `onEndReached` event. Same decision rule on both platforms.
 */
export function shouldFetchNextPage(state: InfiniteFetchState): boolean {
  return state.inView && state.hasNextPage === true && !state.isFetchingNextPage;
}
