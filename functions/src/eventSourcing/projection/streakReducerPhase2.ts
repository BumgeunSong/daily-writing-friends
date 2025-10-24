import { Event, EventType } from '../types/Event';
import { StreamProjectionPhase2 } from '../types/StreamProjectionPhase2';
import {
  isWorkingDayByTz,
  computeRecoveryWindow,
  computeStreakIncrement,
  getEndOfDay,
  getNextWorkingDayKey,
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
    projectorVersion: 'phase2-v2-consecutive', // Updated for consecutive working days fix
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
      // Calculate restored streak from the missedPostDates that were accumulated before transition
      // Use the old status's missedPostDates to get the count
      const previousMissedDates = (state.status.type === 'missed' && state.status.missedPostDates)
        ? state.status.missedPostDates
        : [];

      // Include the current post that triggered the transition
      const allMissedDates = [...previousMissedDates, dayKey];
      const restoredStreak = calculateRestoredStreak(allMissedDates, timezone);

      newState.currentStreak = newState.originalStreak + restoredStreak;
      newState.longestStreak = Math.max(newState.longestStreak, newState.currentStreak);
      newState.originalStreak = newState.currentStreak;

      // Status is already { type: 'onStreak' } from handleMissedPost
    }
  }

  newState.appliedSeq = event.seq;
  return newState;
}

/**
 * Handle DAY_ACTIVITY synthetic event (for extension window).
 * Summarizes the daily posting activity when extending evaluation range.
 * - If eligible: increment currentPosts, check if recovery requirement met
 * - If missed: check rebuild conditions (same-day 2+ posts or consecutive working days)
 * - If onStreak: no change (already in good standing)
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
    // Check if post is within eligible window
    const deadline = newState.status.deadline;
    if (!deadline) return newState;

    const missedDate = newState.status.missedDate;
    if (!missedDate) return newState;

    const missedDayKey = dayKeyFromTimestamp(missedDate, timezone);
    const deadlineDayKey = dayKeyFromTimestamp(deadline, timezone);

    // Check if dayKey is within recovery window [missedDay, deadline]
    if (dayKey < missedDayKey || dayKey > deadlineDayKey) {
      return newState; // Outside recovery window
    }

    // Increment currentPosts
    const currentPosts = (newState.status.currentPosts || 0) + postsCount;
    const postsRequired = newState.status.postsRequired || 0;

    if (currentPosts >= postsRequired) {
      // Recovery requirement met → transition to onStreak
      const increment = computeStreakIncrement(missedDayKey, timezone);
      newState.currentStreak = newState.originalStreak + increment;
      newState.longestStreak = Math.max(newState.longestStreak, newState.currentStreak);
      newState.originalStreak = newState.currentStreak;
      newState.status = { type: 'onStreak' };
    } else {
      // Still eligible, update currentPosts
      newState.status = {
        ...newState.status,
        currentPosts,
      };
    }
  } else if (newState.status.type === 'missed') {
    // Check rebuild conditions
    const missedPostDates = [...(newState.status.missedPostDates || []), dayKey];

    // Same-day rebuild: 2+ posts on one day
    if (postsCount >= 2) {
      newState.status = { type: 'onStreak' };
      newState.currentStreak = 2;
      newState.longestStreak = Math.max(newState.longestStreak, 2);
      newState.originalStreak = 2;
      return newState;
    }

    // Cross-day rebuild: consecutive working days
    const uniqueWorkingDays = Array.from(
      new Set(missedPostDates.filter((day) => isWorkingDayByTz(day, timezone))),
    ).sort();

    if (hasConsecutiveWorkingDays(uniqueWorkingDays, timezone)) {
      // Rebuild streak
      const restoredStreak = calculateRestoredStreak(missedPostDates, timezone);
      newState.currentStreak = newState.originalStreak + restoredStreak;
      newState.longestStreak = Math.max(newState.longestStreak, newState.currentStreak);
      newState.originalStreak = newState.currentStreak;
      newState.status = { type: 'onStreak' };
    } else {
      // Still missed, update missedPostDates
      newState.status = { ...newState.status, missedPostDates };
    }
  }
  // If onStreak: no change needed

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
 * - 2+ consecutive working days with posts: rebuild
 */
function handleMissedPost(
  state: StreamProjectionPhase2,
  dayKey: string,
  timezone: string,
  postsPerDay: Map<string, number>,
): StreamProjectionPhase2['status'] {
  const status = { ...state.status };

  if (status.type !== 'missed') return status;

  // Track this post in missedPostDates (array of all post dates during missed period)
  const missedPostDates = [...(status.missedPostDates || [])];
  missedPostDates.push(dayKey);

  // Check same-day rebuild: count posts on current dayKey (including this one)
  const postsOnDayKey = missedPostDates.filter(d => d === dayKey).length;
  if (postsOnDayKey >= 2) {
    return { type: 'onStreak' };
  }

  // Check cross-day rebuild: consecutive working days with posts
  const uniqueWorkingDays = Array.from(new Set(
    missedPostDates.filter(day => isWorkingDayByTz(day, timezone))
  )).sort();

  if (hasConsecutiveWorkingDays(uniqueWorkingDays, timezone)) {
    return { type: 'onStreak' };
  }

  // Still in missed status - update with new post date
  return { ...status, missedPostDates };
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
 * Check if there are at least 2 consecutive working days in the array.
 * Requires sorted array of dayKeys (YYYY-MM-DD format).
 * Returns true if any two consecutive working days are found.
 */
function hasConsecutiveWorkingDays(sortedWorkingDays: string[], timezone: string): boolean {
  if (sortedWorkingDays.length < 2) return false;

  for (let i = 0; i < sortedWorkingDays.length - 1; i++) {
    const currentDay = sortedWorkingDays[i];
    const nextDay = sortedWorkingDays[i + 1];
    const expectedNextDay = getNextWorkingDayKey(currentDay, timezone);

    if (nextDay === expectedNextDay) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate restored streak from posts during missed period.
 * Counts consecutive working days with at least 1 post.
 */
function calculateRestoredStreak(postDates: string[], timezone: string): number {
  const uniqueWorkingDays = Array.from(new Set(
    postDates.filter((day) => isWorkingDayByTz(day, timezone))
  )).sort();

  if (uniqueWorkingDays.length === 0) return 0;

  // Count longest consecutive streak
  let currentStreak = 1;
  let longestStreak = 1;

  for (let i = 0; i < uniqueWorkingDays.length - 1; i++) {
    const currentDay = uniqueWorkingDays[i];
    const nextDay = uniqueWorkingDays[i + 1];
    const expectedNextDay = getNextWorkingDayKey(currentDay, timezone);

    if (nextDay === expectedNextDay) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return longestStreak;
}

/**
 * Helper: Extract dayKey from Timestamp in given timezone.
 */
function dayKeyFromTimestamp(timestamp: { toDate: () => Date }, timezone: string): string {
  const date = timestamp.toDate();
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}
