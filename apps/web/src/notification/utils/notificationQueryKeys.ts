/**
 * React Query key factory for notification queries. Single source of truth so
 * the hook and the invalidator agree on the exact key shape.
 */
export const createNotificationQueryKey = (userId: string | null) =>
  ['notifications', userId] as const;
