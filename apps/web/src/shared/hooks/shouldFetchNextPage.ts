interface InfiniteFetchState {
  inView: boolean;
  hasNextPage: boolean | undefined;
  isFetchingNextPage: boolean;
}

/** Shared web/RN decision rule for paginated lists. */
export function shouldFetchNextPage(state: InfiniteFetchState): boolean {
  return state.inView && state.hasNextPage === true && !state.isFetchingNextPage;
}
