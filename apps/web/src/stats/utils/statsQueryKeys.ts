/**
 * Shared cache-key builders for stats queries.
 *
 * All writers (batch cache seeding, mutations' invalidate, optimistic updates)
 * and readers (usePostProfileBadges, usePostingStreak) MUST use these to
 * prevent silent cache-key drift.
 */
export const badgeQueryKey = (userId: string) => ['postProfileBadges', userId] as const;

export const streakQueryKey = (userId: string) => ['postingStreak', userId] as const;
