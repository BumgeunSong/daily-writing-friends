import { Event, EventType } from '../types/Event';
import { StreamProjectionPhase1 } from '../types/StreamProjection';

/**
 * Pure reducer function that applies events to projection state.
 * Deterministic and side-effect free for easy testing.
 *
 * @param currentState - Current projection state
 * @param events - Array of events to apply (must be ordered by seq)
 * @param todayDayKey - User's today in their timezone (YYYY-MM-DD)
 * @returns New projection state
 */
export function applyEventsToProjection(
  currentState: StreamProjectionPhase1,
  events: Event[],
  todayDayKey: string,
): StreamProjectionPhase1 {
  let state = { ...currentState };

  for (const event of events) {
    switch (event.type) {
      case EventType.POST_CREATED:
        if (
          !state.lastContributionDate ||
          event.dayKey > state.lastContributionDate
        ) {
          state.lastContributionDate = event.dayKey;
        }

        if (event.dayKey === todayDayKey) {
          state.currentDayPostCount += 1;
        }

        state.appliedSeq = event.seq;
        break;

      case EventType.POST_DELETED:
        state.appliedSeq = event.seq;
        break;

      case EventType.TIMEZONE_CHANGED:
        state.appliedSeq = event.seq;
        break;
    }
  }

  return state;
}

/**
 * Creates initial empty projection state
 */
export function createInitialProjection(): StreamProjectionPhase1 {
  return {
    lastContributionDate: null,
    currentDayPostCount: 0,
    appliedSeq: 0,
    projectorVersion: 'phase1-v1',
  };
}
