import { Event, EventType } from '../types/Event';
import { StreamProjectionPhase2 } from '../types/StreamProjectionPhase2';
import {
  isWorkingDayByTz,
  computeRecoveryWindow,
  computeStreakIncrement,
  getEndOfDay,
} from '../utils/workingDayUtils';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Runtime guard: validates originalStreak mutations only happen in allowed contexts.
 * In dev/test: throws if originalStreak changes when status is onStreak (should be frozen).
 */
function validateOriginalStreakMutation(
  before: StreamProjectionPhase2,
  after: StreamProjectionPhase2,
  context: string,
): void {
  if (process.env.NODE_ENV === 'production') return;

  // Allow changes when entering eligible (snapshot) or during any recovery/rebuild
  const allowedContexts = [
    'enterEligible',
    'restore',
    'rebuild',
    'startOver',
    'initialization',
  ];

  // Detect mutation
  if (before.originalStreak !== after.originalStreak) {
    // If status was onStreak and stayed onStreak, this is INVALID
    if (before.status.type === 'onStreak' && after.status.type === 'onStreak') {
      throw new Error(
        `[INVARIANT] originalStreak mutated while onStreak (${before.originalStreak} → ${after.originalStreak}) in context: ${context}`,
      );
    }

    // Otherwise, ensure we're in an allowed context
    if (!allowedContexts.includes(context)) {
      console.warn(
        `[GUARD] originalStreak changed in unexpected context: ${context} (${before.originalStreak} → ${after.originalStreak})`,
      );
    }
  }
}

/**
 * Creates initial Phase 2 projection state.
 * Users start with missed status and zero streak.
 */
export function createInitialPhase2Projection(): StreamProjectionPhase2 {
  return {
    status: { type: 'missed' },
    currentStreak: 0,
    originalStreak: 0,
    longestStreak: 0,
    lastContributionDate: null,
    appliedSeq: 0,
    projectorVersion: 'phase2.1-no-crossday-v1', // Removed cross-day rebuild logic
  };
}

/**
 * Pure reducer function that applies events to Phase 2 projection.
 * Implements recovery logic with onStreak/eligible/missed state machine.
 *
 * @param currentState - Current Phase 2 projection state
 * @param events - Array of events to apply (ordered by seq)
 * @param timezone - User's IANA timezone
 * @returns New projection state
 */
export function applyEventsToPhase2Projection(
  currentState: StreamProjectionPhase2,
  events: Event[],
  timezone: string,
): StreamProjectionPhase2 {
  let state = { ...currentState };

  // Track posts per day for missed rebuild logic
  const postsPerDay = new Map<string, number>();

  for (const event of events) {
    switch (event.type) {
      case EventType.POST_CREATED:
        state = handlePostCreated(state, event, timezone, postsPerDay);
        break;

      case EventType.DAY_ACTIVITY:
        state = handleDayActivity(state, event, timezone);
        break;

      case EventType.DAY_CLOSED:
        // Legacy persisted events - treat same as DAY_CLOSED_VIRTUAL
        state = handleDayClosedVirtual(state, event, timezone, postsPerDay);
        break;

      case EventType.DAY_CLOSED_VIRTUAL:
        state = handleDayClosedVirtual(state, event, timezone, postsPerDay);
        break;

      case EventType.POST_DELETED:
        // Minimal handling: only adjust currentPosts in eligible window if needed
        state.appliedSeq = event.seq;
        break;

      case EventType.TIMEZONE_CHANGED:
        // No retroactive effect
        state.appliedSeq = event.seq;
        break;
    }
  }

  return state;
}

/**
 * Handle PostCreated event.
 * - Update lastContributionDate
 * - If eligible: check if recovery requirement met
 * - If missed: check rebuild conditions
 */
function handlePostCreated(
  state: StreamProjectionPhase2,
  event: Event,
  timezone: string,
  postsPerDay: Map<string, number>,
): StreamProjectionPhase2 {
  if (event.type !== EventType.POST_CREATED) return state;

  const newState = { ...state };
  const { dayKey } = event;

  // Update lastContributionDate
  if (!newState.lastContributionDate || dayKey > newState.lastContributionDate) {
    newState.lastContributionDate = dayKey;
  }

  // Track posts per day for missed rebuild
  postsPerDay.set(dayKey, (postsPerDay.get(dayKey) || 0) + 1);

  // Handle status-specific logic
  if (newState.status.type === 'eligible') {
    // Save context before potential transition
    const savedMissedDate = newState.status.missedDate;
    const savedDeadline = newState.status.deadline;
    const savedCurrentPosts = newState.status.currentPosts || 0;

    newState.status = handleEligiblePost(newState, dayKey, timezone);

    // Check if transition to onStreak
    if (newState.status.type === 'onStreak' && savedMissedDate) {
      const missedDayKey = dayKeyFromTimestamp(savedMissedDate, timezone);
      const deadlineDayKey = savedDeadline ? dayKeyFromTimestamp(savedDeadline, timezone) : '';

      // Check if this is same-day rebuild (missed + 2 posts same day)
      if (missedDayKey === dayKey) {
        // Same-day rebuild from missed: always streak=2
        newState.currentStreak = 2;
        newState.longestStreak = Math.max(newState.longestStreak, 2);
        newState.originalStreak = 2;
      } else if (dayKey > deadlineDayKey && savedCurrentPosts > 0) {
        // Start-over: posted after deadline with partial progress
        newState.currentStreak = 1;
        newState.longestStreak = Math.max(newState.longestStreak, 1);
        newState.originalStreak = 1;
      } else {
        // Regular recovery: restore with policy increment
        const increment = computeStreakIncrement(missedDayKey, timezone);
        newState.currentStreak = newState.originalStreak + increment;
        newState.longestStreak = Math.max(newState.longestStreak, newState.currentStreak);
        newState.originalStreak = newState.currentStreak;
      }
    }
  } else if (newState.status.type === 'missed') {
    newState.status = handleMissedPost(newState, dayKey, timezone, postsPerDay);

    // Check if transition to onStreak via same-day rebuild
    if (newState.status.type === 'onStreak') {
      // Same-day rebuild: 2+ posts on one day → streak = 2
      newState.currentStreak = 2;
      newState.longestStreak = Math.max(newState.longestStreak, 2);
      newState.originalStreak = 2;
    }
  }

  newState.appliedSeq = event.seq;

  // Runtime guard: validate originalStreak mutations
  const context =
    newState.status.type === 'onStreak' && state.status.type === 'eligible'
      ? 'restore'
      : newState.status.type === 'onStreak' && state.status.type === 'missed'
        ? 'rebuild'
        : 'postCreated';
  validateOriginalStreakMutation(state, newState, context);

  return newState;
}

/**
 * Handle DAY_ACTIVITY synthetic event (for extension window).
 * New rules (no cross-day rebuild):
 * - If eligible on recovery day: 2+ posts → restore, 1 post → start over at day close
 * - If missed: first post → enter eligible (same-day recovery), 2+ posts → restore
 * - If onStreak: no change
 */
function handleDayActivity(
  state: StreamProjectionPhase2,
  event: Event,
  timezone: string,
): StreamProjectionPhase2 {
  if (event.type !== EventType.DAY_ACTIVITY) return state;

  const newState = { ...state };
  const { dayKey, payload } = event as { dayKey: string; payload: { postsCount: number } };
  const { postsCount } = payload;

  // Update lastContributionDate
  if (!newState.lastContributionDate || dayKey > newState.lastContributionDate) {
    newState.lastContributionDate = dayKey;
  }

  if (newState.status.type === 'eligible') {
    // Check if this is the recovery day
    const deadline = newState.status.deadline;
    if (!deadline) return newState;

    const missedDate = newState.status.missedDate;
    if (!missedDate) return newState;

    const missedDayKey = dayKeyFromTimestamp(missedDate, timezone);
    const deadlineDayKey = dayKeyFromTimestamp(deadline, timezone);

    // Check if dayKey is the recovery day
    if (dayKey !== deadlineDayKey) {
      return newState; // Not recovery day, no action
    }

    // Increment currentPosts
    const currentPosts = (newState.status.currentPosts || 0) + postsCount;
    const postsRequired = newState.status.postsRequired || 0;

    if (currentPosts >= postsRequired) {
      // Recovery requirement met → restore streak
      const increment = computeStreakIncrement(missedDayKey, timezone);
      newState.currentStreak = newState.originalStreak + increment;
      newState.longestStreak = Math.max(newState.longestStreak, newState.currentStreak);
      newState.originalStreak = newState.currentStreak;
      newState.status = { type: 'onStreak' };
    } else {
      // Update currentPosts, will be handled at day close
      newState.status = {
        ...newState.status,
        currentPosts,
      };
    }
  } else if (newState.status.type === 'missed') {
    // From missed: first post enters eligible (same-day recovery)
    if (postsCount >= 2) {
      // Same-day rebuild: 2+ posts → restore with +2 (weekday semantics)
      newState.status = { type: 'onStreak' };
      newState.currentStreak = 2;
      newState.longestStreak = Math.max(newState.longestStreak, 2);
      newState.originalStreak = 2;
    } else {
      // 1 post: enter eligible for same-day recovery (will close to onStreak(1) at day close)
      // Treat as recovery-in-progress
      newState.status = {
        type: 'eligible',
        currentPosts: postsCount,
        postsRequired: 2, // Weekday semantics for missed state
        missedDate: getEndOfDay(dayKey, timezone), // Mark today as the "miss"
        deadline: getEndOfDay(dayKey, timezone), // Same-day recovery
      };
    }
  }
  // If onStreak: no change needed

  // Runtime guard: validate originalStreak mutations
  const context =
    newState.status.type === 'onStreak' && state.status.type === 'eligible'
      ? 'restore'
      : newState.status.type === 'onStreak' && state.status.type === 'missed'
        ? 'rebuild'
        : 'dayActivity';
  validateOriginalStreakMutation(state, newState, context);

  return newState;
}

/**
 * Handle post during eligible status.
 * Posts during recovery window increment currentPosts.
 * If requirement met, transition to onStreak.
 * If post is after deadline, apply "deadline closed" logic first.
 */
function handleEligiblePost(
  state: StreamProjectionPhase2,
  dayKey: string,
  timezone: string,
): StreamProjectionPhase2['status'] {
  const status = { ...state.status };

  if (status.type !== 'eligible') return status;

  // Check if post is within eligible window (from miss until deadline)
  const deadline = status.deadline;
  if (!deadline) return status;

  const deadlineDayKey = dayKeyFromTimestamp(deadline, timezone);
  const postIsBeforeOrOnDeadline = dayKey <= deadlineDayKey;

  if (postIsBeforeOrOnDeadline) {
    status.currentPosts = (status.currentPosts || 0) + 1;

    // Check if requirement met
    if (status.currentPosts >= (status.postsRequired || 2)) {
      // Transition to onStreak
      return { type: 'onStreak' };
    }
  } else {
    // Post is after deadline → deadline expired
    // Apply "recovery day close" logic based on currentPosts at deadline
    const currentPosts = status.currentPosts || 0;

    if (currentPosts > 0) {
      // Had partial progress → start over to onStreak(1)
      // The new post will be processed as onStreak in handlePostCreated
      return { type: 'onStreak' };
    } else {
      // No progress → fall to missed
      return { type: 'missed' };
    }
  }

  return status;
}

/**
 * Handle post during missed status.
 * New rules (no cross-day rebuild):
 * - First post on a working day: enter eligible for same-day recovery
 * - Second post same day: restore with +2 (weekday semantics)
 */
function handleMissedPost(
  state: StreamProjectionPhase2,
  dayKey: string,
  timezone: string,
  postsPerDay: Map<string, number>,
): StreamProjectionPhase2['status'] {
  const status = { ...state.status };

  if (status.type !== 'missed') return status;

  // Count posts on this day (including current one)
  const postsOnDay = (postsPerDay.get(dayKey) || 0);

  if (postsOnDay >= 2) {
    // Same-day rebuild: 2+ posts → restore with +2
    return { type: 'onStreak' };
  }

  // First post: enter eligible for same-day recovery
  return {
    type: 'eligible',
    currentPosts: postsOnDay,
    postsRequired: 2, // Weekday semantics
    missedDate: getEndOfDay(dayKey, timezone),
    deadline: getEndOfDay(dayKey, timezone), // Same-day recovery
  };
}

/**
 * Handle DAY_CLOSED_VIRTUAL event (working day with 0 posts).
 * New rules:
 * - If onStreak: enter eligible (capture originalStreak, set recovery requirements)
 * - If eligible on recovery day close:
 *   - currentPosts >= postsRequired: already restored (no-op)
 *   - currentPosts > 0: start over with onStreak(1)
 *   - currentPosts == 0: transition to missed(0)
 */
function handleDayClosedVirtual(
  state: StreamProjectionPhase2,
  event: Event,
  timezone: string,
  postsPerDay: Map<string, number>,
): StreamProjectionPhase2 {
  if (event.type !== EventType.DAY_CLOSED && event.type !== EventType.DAY_CLOSED_VIRTUAL) {
    return state;
  }

  const newState = { ...state };
  const { dayKey } = event;

  const isWorkingDay = isWorkingDayByTz(dayKey, timezone);
  // Check if there were posts on this day:
  // 1. In current event batch (postsPerDay map)
  // 2. Or this is the last contribution date (from previous batches)
  const hadPostsOnDay = postsPerDay.has(dayKey) || dayKey === state.lastContributionDate;

  // First check if this is recovery day close (takes priority)
  if (newState.status.type === 'eligible' && newState.status.deadline) {
    const deadlineDayKey = dayKeyFromTimestamp(newState.status.deadline, timezone);

    if (dayKey === deadlineDayKey) {
      // Recovery day is closing
      const currentPosts = newState.status.currentPosts || 0;
      const postsRequired = newState.status.postsRequired || 2;

      if (currentPosts >= postsRequired) {
        // Already restored by DAY_ACTIVITY or handlePostCreated (no-op)
        // This shouldn't happen in normal flow
      } else if (currentPosts > 0) {
        // Start over: onStreak with currentStreak = 1
        newState.status = { type: 'onStreak' };
        newState.currentStreak = 1;
        newState.longestStreak = Math.max(newState.longestStreak, 1);
        newState.originalStreak = 1;
        postsPerDay.clear();
      } else {
        // currentPosts == 0: transition to missed
        newState.status = { type: 'missed' };
        newState.currentStreak = 0;
        postsPerDay.clear();
      }

      // Recovery day handled, return early
      newState.appliedSeq = event.seq;
      return newState;
    }
  }

  // Handle regular day close: working day with no posts from onStreak
  if (isWorkingDay && !hadPostsOnDay && newState.status.type === 'onStreak') {
    // Enter eligible (miss on working day)
    const { postsRequired, deadline } = computeRecoveryWindow(dayKey, timezone);

    newState.status = {
      type: 'eligible',
      postsRequired,
      currentPosts: 0,
      deadline,
      missedDate: getEndOfDay(dayKey, timezone),
    };

    newState.originalStreak = newState.currentStreak;
    newState.currentStreak = 0;
  }

  newState.appliedSeq = event.seq;

  // Runtime guard: validate originalStreak mutations
  const context =
    newState.status.type === 'eligible' && state.status.type === 'onStreak'
      ? 'enterEligible'
      : newState.status.type === 'onStreak' && state.status.type === 'eligible'
        ? 'startOver'
        : 'dayClosed';
  validateOriginalStreakMutation(state, newState, context);

  return newState;
}

/**
 * Helper: Extract dayKey from Timestamp in given timezone.
 */
function dayKeyFromTimestamp(timestamp: { toDate: () => Date }, timezone: string): string {
  const date = timestamp.toDate();
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}
