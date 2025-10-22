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
    projectorVersion: 'phase2-v1',
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

      case EventType.DAY_CLOSED:
        state = handleDayClosed(state, event, timezone, postsPerDay);
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
    // Save missedDate before potential transition
    const savedMissedDate = newState.status.missedDate;

    newState.status = handleEligiblePost(newState, dayKey, timezone);

    // Check if transition to onStreak
    if (newState.status.type === 'onStreak' && savedMissedDate) {
      // Transition happened - restore streak
      const missedDayKey = dayKeyFromTimestamp(savedMissedDate, timezone);
      const increment = computeStreakIncrement(missedDayKey, timezone);
      newState.currentStreak = newState.originalStreak + increment;
      newState.longestStreak = Math.max(newState.longestStreak, newState.currentStreak);
      newState.originalStreak = newState.currentStreak;

      // Clear eligible fields (already cleared by handleEligiblePost returning { type: 'onStreak' })
    }
  } else if (newState.status.type === 'missed') {
    newState.status = handleMissedPost(newState, dayKey, timezone, postsPerDay);

    // Check if transition to onStreak via rebuild
    if (newState.status.type === 'onStreak') {
      // Calculate restored streak based on posts
      const restoredStreak = calculateRestoredStreak(postsPerDay, timezone);
      newState.currentStreak = newState.originalStreak + restoredStreak;
      newState.longestStreak = Math.max(newState.longestStreak, newState.currentStreak);
      newState.originalStreak = newState.currentStreak;

      // Clear missed fields
      delete newState.status.missedDate;
    }
  }

  newState.appliedSeq = event.seq;
  return newState;
}

/**
 * Handle post during eligible status.
 * Posts during recovery window increment currentPosts.
 * If requirement met, transition to onStreak.
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

  const postIsBeforeDeadline = dayKey <= dayKeyFromTimestamp(deadline, timezone);

  if (postIsBeforeDeadline) {
    status.currentPosts = (status.currentPosts || 0) + 1;

    // Check if requirement met
    if (status.currentPosts >= (status.postsRequired || 2)) {
      // Transition to onStreak
      return { type: 'onStreak' };
    }
  }

  return status;
}

/**
 * Handle post during missed status.
 * Check rebuild conditions:
 * - Same-day 2 posts: immediate rebuild
 * - Cross-day ≥2 working days with posts: rebuild
 */
function handleMissedPost(
  state: StreamProjectionPhase2,
  dayKey: string,
  timezone: string,
  postsPerDay: Map<string, number>,
): StreamProjectionPhase2['status'] {
  const status = { ...state.status };

  if (status.type !== 'missed') return status;

  const postsToday = postsPerDay.get(dayKey) || 0;

  // Same-day rebuild: 2 posts on same day
  if (postsToday >= 2) {
    return { type: 'onStreak' };
  }

  // Cross-day rebuild: ≥2 working days with at least 1 post each
  const workingDaysWithPosts = Array.from(postsPerDay.keys()).filter((day) =>
    isWorkingDayByTz(day, timezone),
  );

  if (workingDaysWithPosts.length >= 2) {
    return { type: 'onStreak' };
  }

  return status;
}

/**
 * Handle DayClosed event.
 * - If working day without posts and onStreak: transition to eligible
 * - If eligible and deadline passed without meeting requirement: transition to missed
 */
function handleDayClosed(
  state: StreamProjectionPhase2,
  event: Event,
  timezone: string,
  postsPerDay: Map<string, number>,
): StreamProjectionPhase2 {
  if (event.type !== EventType.DAY_CLOSED) return state;

  const newState = { ...state };
  const { dayKey } = event;

  const isWorkingDay = isWorkingDayByTz(dayKey, timezone);
  const hadPostsOnDay = postsPerDay.has(dayKey);

  // Check for miss on working day
  if (isWorkingDay && !hadPostsOnDay) {
    if (newState.status.type === 'onStreak') {
      // Transition to eligible
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
  }

  // Check if closing recovery deadline day
  if (newState.status.type === 'eligible' && newState.status.deadline) {
    const deadlineDayKey = dayKeyFromTimestamp(newState.status.deadline, timezone);

    if (dayKey === deadlineDayKey) {
      // Recovery day is closing - check if requirement met
      const currentPosts = newState.status.currentPosts || 0;
      const postsRequired = newState.status.postsRequired || 2;

      if (currentPosts < postsRequired) {
        // Transition to missed - preserve partial progress
        newState.status = {
          type: 'missed',
          missedDate: newState.status.missedDate,
        };
        newState.currentStreak = currentPosts;

        // Clear postsPerDay for fresh rebuild tracking
        postsPerDay.clear();
      }
    }
  }

  newState.appliedSeq = event.seq;
  return newState;
}

/**
 * Calculate restored streak from posts during missed period.
 * Returns the number of working days with at least 1 post.
 */
function calculateRestoredStreak(postsPerDay: Map<string, number>, timezone: string): number {
  const workingDaysWithPosts = Array.from(postsPerDay.keys()).filter((day) =>
    isWorkingDayByTz(day, timezone),
  );
  return workingDaysWithPosts.length;
}

/**
 * Helper: Extract dayKey from Timestamp in given timezone.
 */
function dayKeyFromTimestamp(timestamp: { toDate: () => Date }, timezone: string): string {
  const date = timestamp.toDate();
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}
