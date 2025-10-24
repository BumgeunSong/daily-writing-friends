import { Event, EventType } from '../types/Event';
import { StreamProjectionPhase2 } from '../types/StreamProjectionPhase2';
import { applyEventsToPhase2Projection } from './streakReducerPhase2';
import {
  ExplainProjectionResponse,
  EventExplanation,
  StreakSnapshot,
  EventChange,
  ExplanationSummary,
} from './types/ExplainProjection';

/**
 * Explain how events transform projection state step-by-step.
 * Pure function that processes events and generates detailed explanations.
 *
 * @param initialState - Starting projection state
 * @param events - Array of events to process (including virtual closures)
 * @param timezone - User's IANA timezone
 * @returns Detailed explanation of state transformations
 */
export function explainStreakReducer(
  initialState: StreamProjectionPhase2,
  events: Event[],
  timezone: string,
): ExplainProjectionResponse {
  const eventExplanations: EventExplanation[] = [];
  let currentState = { ...initialState };
  let statusTransitions = 0;
  let streakChanges = 0;
  let virtualClosures = 0;

  for (const event of events) {
    const stateBefore = captureStateSnapshot(currentState);

    // Apply single event to get next state
    const stateAfter = applyEventsToPhase2Projection(currentState, [event], timezone);
    const stateAfterSnapshot = captureStateSnapshot(stateAfter);

    const changes = detectChanges(stateBefore, stateAfterSnapshot, event);

    // Count transitions and changes
    if (stateBefore.status !== stateAfterSnapshot.status) {
      statusTransitions++;
    }
    if (
      stateBefore.currentStreak !== stateAfterSnapshot.currentStreak ||
      stateBefore.longestStreak !== stateAfterSnapshot.longestStreak
    ) {
      streakChanges++;
    }

    const isVirtual = isVirtualEvent(event);
    if (isVirtual) {
      virtualClosures++;
    }

    eventExplanations.push({
      seq: event.seq,
      type: getEventTypeName(event.type),
      dayKey: event.dayKey,
      isVirtual,
      stateBefore,
      stateAfter: stateAfterSnapshot,
      changes,
    });

    currentState = stateAfter;
  }

  const summary: ExplanationSummary = {
    totalEvents: events.length,
    virtualClosures,
    statusTransitions,
    streakChanges,
    evaluatedPeriod: {
      start: events[0]?.dayKey ?? '',
      end: events[events.length - 1]?.dayKey ?? '',
    },
  };

  return {
    finalProjection: currentState,
    eventExplanations,
    summary,
  };
}

/**
 * Capture snapshot of projection state with expanded context.
 */
function captureStateSnapshot(state: StreamProjectionPhase2): StreakSnapshot {
  const snapshot: StreakSnapshot = {
    status: state.status.type,
    currentStreak: state.currentStreak,
    originalStreak: state.originalStreak,
    longestStreak: state.longestStreak,
    lastContributionDate: state.lastContributionDate,
  };

  // Include eligible context if applicable
  if (state.status.type === 'eligible') {
    snapshot.eligibleContext = {
      postsRequired: state.status.postsRequired ?? 0,
      currentPosts: state.status.currentPosts ?? 0,
      deadline: state.status.deadline ? formatTimestamp(state.status.deadline) : '',
      missedDate: state.status.missedDate ? formatTimestamp(state.status.missedDate) : '',
    };
  }

  // No missed context in phase2.1-no-crossday-v1 (no cross-day rebuild tracking)

  return snapshot;
}

/**
 * Detect changes between before and after snapshots.
 */
function detectChanges(
  before: StreakSnapshot,
  after: StreakSnapshot,
  event: Event,
): EventChange[] {
  const changes: EventChange[] = [];

  // Status change
  if (before.status !== after.status) {
    changes.push({
      field: 'status.type',
      before: before.status,
      after: after.status,
      reason: explainStatusTransition(before, after, event),
    });
  }

  // Current streak change
  if (before.currentStreak !== after.currentStreak) {
    changes.push({
      field: 'currentStreak',
      before: before.currentStreak,
      after: after.currentStreak,
      reason: explainStreakChange(before, after, event),
    });
  }

  // Original streak change
  if (before.originalStreak !== after.originalStreak) {
    changes.push({
      field: 'originalStreak',
      before: before.originalStreak,
      after: after.originalStreak,
      reason: 'Saved streak before transition',
    });
  }

  // Longest streak change
  if (before.longestStreak !== after.longestStreak) {
    changes.push({
      field: 'longestStreak',
      before: before.longestStreak,
      after: after.longestStreak,
      reason: 'New personal record',
    });
  }

  // Last contribution date change
  if (before.lastContributionDate !== after.lastContributionDate) {
    changes.push({
      field: 'lastContributionDate',
      before: before.lastContributionDate,
      after: after.lastContributionDate,
      reason: 'Post created on new date',
    });
  }

  return changes;
}

/**
 * Explain why status transition occurred.
 */
function explainStatusTransition(
  before: StreakSnapshot,
  after: StreakSnapshot,
  event: Event,
): string {
  const transition = `${before.status} → ${after.status}`;

  if (event.type === EventType.DAY_CLOSED) {
    if (transition === 'onStreak → eligible') {
      return 'Missed working day without posts; entered recovery window';
    }
    if (transition === 'eligible → missed') {
      return 'Recovery deadline passed without meeting requirement';
    }
  }

  if (event.type === EventType.POST_CREATED) {
    if (transition === 'eligible → onStreak') {
      return 'Met recovery requirement; streak restored';
    }
    if (transition === 'missed → onStreak') {
      return 'Rebuild condition met (same-day 2 posts)';
    }
  }

  return `Status changed from ${before.status} to ${after.status}`;
}

/**
 * Explain why streak value changed.
 */
function explainStreakChange(
  before: StreakSnapshot,
  after: StreakSnapshot,
  event: Event,
): string {
  const diff = after.currentStreak - before.currentStreak;

  if (after.currentStreak === 0 && before.currentStreak > 0) {
    return 'Streak reset due to miss (saved to originalStreak)';
  }

  if (diff > 0 && before.status === 'eligible' && after.status === 'onStreak') {
    return `Streak restored from ${before.originalStreak} with increment`;
  }

  if (diff > 0 && before.status === 'missed' && after.status === 'onStreak') {
    return `Streak rebuilt from posts during missed period`;
  }

  if (diff > 0) {
    return `Streak incremented by ${diff}`;
  }

  if (diff < 0) {
    return `Streak decreased by ${Math.abs(diff)}`;
  }

  return 'Streak unchanged';
}

/**
 * Check if event is virtual (derived at read time).
 */
function isVirtualEvent(event: Event): boolean {
  if (event.type !== EventType.DAY_CLOSED) {
    return false;
  }
  return event.idempotencyKey?.startsWith('virtual:') ?? false;
}

/**
 * Get human-readable event type name.
 */
function getEventTypeName(type: EventType): 'PostCreated' | 'PostDeleted' | 'TimezoneChanged' | 'DayClosed' {
  switch (type) {
    case EventType.POST_CREATED:
      return 'PostCreated';
    case EventType.POST_DELETED:
      return 'PostDeleted';
    case EventType.TIMEZONE_CHANGED:
      return 'TimezoneChanged';
    case EventType.DAY_CLOSED:
      return 'DayClosed';
    default:
      return 'DayClosed';
  }
}

/**
 * Format Firestore Timestamp to ISO string.
 */
function formatTimestamp(timestamp: { toDate: () => Date }): string {
  return timestamp.toDate().toISOString();
}
