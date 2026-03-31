export type TopicMissionStatus = 'pending' | 'assigned' | 'completed' | 'skipped';

export type TopicMissionEntry = {
  id: string;
  status: TopicMissionStatus;
  order_index: number;
};

export type NextAssignmentResult = {
  completeId: string | null;
  assignId: string;
  wrapped: boolean;
};

// Valid status transitions for topic_missions lifecycle.
// The DB allows broader transitions (e.g. wrap-around resets completed/skipped → pending,
// and admin/edge-function paths may reset assigned → pending or skip from pending directly).
const VALID_TRANSITIONS: Partial<Record<TopicMissionStatus, TopicMissionStatus[]>> = {
  pending: ['assigned', 'skipped'],
  assigned: ['completed', 'skipped', 'pending'],
  completed: ['pending'],
  skipped: ['pending'],
};

export function isValidStatusTransition(from: TopicMissionStatus, to: TopicMissionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Computes the next presenter assignment from the current queue state.
 *
 * Pure function mirror of the advance_topic_presenter Postgres RPC.
 * The Postgres RPC handles actual DB mutations atomically; this function
 * exists only for unit testing the queue advancement algorithm.
 *
 * @param entries - Current queue entries (any order)
 * @returns completeId (previously assigned entry id, or null), assignId (next entry to assign), wrapped (true if cycle reset occurred)
 */
export function computeNextAssignment(entries: TopicMissionEntry[]): NextAssignmentResult {
  const assignedEntry = entries.find((e) => e.status === 'assigned') ?? null;
  const completeId = assignedEntry?.id ?? null;

  // Simulate completing the current assigned entry
  const afterComplete: TopicMissionEntry[] = entries.map((e) =>
    e.id === completeId ? { ...e, status: 'completed' } : e,
  );

  const pendingSorted = afterComplete
    .filter((e) => e.status === 'pending')
    .sort((a, b) => a.order_index - b.order_index);

  if (pendingSorted.length > 0) {
    return { completeId, assignId: pendingSorted[0].id, wrapped: false };
  }

  // Wrap-around: reset all completed/skipped back to pending
  const wrappedEntries: TopicMissionEntry[] = afterComplete.map((e) =>
    e.status === 'completed' || e.status === 'skipped' ? { ...e, status: 'pending' } : e,
  );

  const wrappedPendingSorted = wrappedEntries
    .filter((e) => e.status === 'pending')
    .sort((a, b) => a.order_index - b.order_index);

  if (wrappedPendingSorted.length === 0) {
    throw new Error('No entries in queue');
  }

  return { completeId, assignId: wrappedPendingSorted[0].id, wrapped: true };
}
