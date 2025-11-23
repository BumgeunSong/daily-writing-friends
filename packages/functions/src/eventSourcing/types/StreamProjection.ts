export interface StreamProjectionPhase1 {
  lastContributionDate: string | null; // dayKey of latest post
  currentDayPostCount: number; // Count of posts for today (user tz)
  appliedSeq: number; // Checkpoint for idempotency
  projectorVersion: string; // e.g., 'phase1-v1'
}
