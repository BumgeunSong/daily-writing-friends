/**
 * Shared cache-key builder for the "boards this user can access" query.
 *
 * Both the route loader (boardsLoader → ensureQueryData) and the page consumer
 * (BoardListPage → useQuery) MUST use this so the loader's warm-cache write
 * lands on the same key the component reads — otherwise back-nav re-fetches
 * and the navigation progress bar flashes.
 */
export const userBoardsQueryKey = (uid: string | null | undefined) =>
  ['boards', uid] as const;
