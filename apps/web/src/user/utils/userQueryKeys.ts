/**
 * Shared cache-key builder for user queries.
 *
 * All writers (loader ensureQueryData, mutations' invalidate) and readers (useUser)
 * MUST use this to prevent silent cache-key drift. Accepts nullish uid because
 * useUser callers commonly pass an unresolved `currentUser?.uid`; the actual
 * query is gated by `enabled: !!uid` so a `['user', null]` key never fires —
 * the helper just keeps the type honest at call sites.
 */
export const userQueryKey = (uid: string | null | undefined) =>
  ['user', uid] as const;
