/**
 * Day-by-Day Simulation Engine
 *
 * Implements REQ-106: Recovery Semantics
 * Implements REQ-107: Eligible Progress, Failure Carry, and originalStreak
 * Implements REQ-108: Completing Recovery & Same-Day Return Path
 * Implements REQ-109: Longest Streak Computation
 *
 * This is the core business logic that simulates streak states
 * day-by-day using historical posting data.
 */

import { Timestamp } from 'firebase-admin/firestore';
import {
  DayBucket,
  SimulationState,
  DaySimulationResult,
  SimulationResult,
  RecoveryEvent,
  SimulationStats,
} from './types';
import { RecoveryStatusType } from '../recoveryStatus/StreakInfo';
import {
  doesSatisfyDailyStreak,
  calculateHistoricalRecoveryWindow,
  countRecoveryContributingPosts,
  isValidRecoveryDay,
} from './kstCalendarLogic';
import {
  createRecoveryEventFromSimulation,
  buildRecoveryHistoryForSimulation,
} from './recoveryHistoryGeneration';

/**
 * Main simulation function: processes historical data day-by-day
 * REQ-104: Simulate from earliest post through As-Of Horizon
 */
export async function simulateHistoricalStreak(
  dayBuckets: DayBucket[],
  initialState: SimulationState,
  horizonEndKstDateString?: string,
): Promise<SimulationResult> {
  const startTime = Date.now();

  // Generate complete day timeline including missing days
  const completeDayBuckets = generateCompleteDayTimeline(dayBuckets, horizonEndKstDateString);

  // Debug: log complete timeline
  console.log('Complete day timeline:');
  completeDayBuckets.forEach((bucket) => {
    console.log(
      `- ${bucket.kstDateString}: ${bucket.events.length} posts, working: ${bucket.isWorkingDay}`,
    );
  });

  // Initialize simulation state
  let currentState: SimulationState = {
    ...initialState,
    lastCalculated: Timestamp.now(),
  };

  const dayResults: DaySimulationResult[] = [];
  const recoveryEvents: RecoveryEvent[] = [];

  // Process each day in chronological order (including missing days)
  for (const dayBucket of completeDayBuckets) {
    const dayResult = await processSimulationDay(dayBucket, currentState);

    // Debug: Log important state transitions
    if (dayBucket.kstDateString >= '2025-07-25' && dayBucket.kstDateString <= '2025-08-05') {
      const beforeStatus = currentState.status;
      const afterStatus = dayResult.newState.status;

      console.log(`DEBUG ${dayBucket.kstDateString}:`, {
        posts: dayBucket.events.length,
        working: dayBucket.isWorkingDay,
        before: {
          status: beforeStatus.type,
          streak: currentState.currentStreak,
          originalStreak: currentState.originalStreak,
          missedDate:
            beforeStatus.type === 'eligible'
              ? beforeStatus.missedDate
                  ?.toDate()
                  .toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
              : undefined,
        },
        after: {
          status: afterStatus.type,
          streak: dayResult.newState.currentStreak,
          originalStreak: dayResult.newState.originalStreak,
          missedDate:
            afterStatus.type === 'eligible'
              ? afterStatus.missedDate
                  ?.toDate()
                  .toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
              : undefined,
        },
        transition: dayResult.stateTransition,
        recoveryProgress: dayResult.recoveryProgress,
      });
    }

    dayResults.push(dayResult);

    // Collect recovery events if any occurred (using previous state before transition)
    if (dayResult.recoveryProgress?.completed) {
      const recoveryEvent = createRecoveryFromDayResult(dayBucket, dayResult, currentState);
      if (recoveryEvent) {
        recoveryEvents.push(recoveryEvent);
      }
    }

    currentState = dayResult.newState;
  }

  const processingTime = Date.now() - startTime;

  // Build final simulation result
  const finalResult: SimulationResult = {
    initialState,
    finalState: currentState,
    dayResults,
    recoveryEvents: buildRecoveryHistoryForSimulation({
      recoveryEvents,
    } as SimulationResult),
    stats: calculateSimulationStats(dayResults, recoveryEvents, processingTime),
  };

  return finalResult;
}

/**
 * Process a single day in the simulation
 * Handles all possible state transitions and recovery logic
 */
export async function processSimulationDay(
  dayBucket: DayBucket,
  currentState: SimulationState,
): Promise<DaySimulationResult> {
  const postsCount = dayBucket.events.length;
  const streakSatisfied = doesSatisfyDailyStreak(dayBucket);

  let newState = { ...currentState };
  let stateTransition: { from: string; to: string; reason: string } | undefined;
  let recoveryProgress: { required: number; written: number; completed: boolean } | undefined;

  // Handle state transitions based on current status
  switch (currentState.status.type) {
    case RecoveryStatusType.ON_STREAK:
      if (streakSatisfied) {
        // Maintain or increment streak
        newState = handleOnStreakToContinue(newState, dayBucket);
      } else if (dayBucket.isWorkingDay) {
        // Working day miss → transition to eligible
        const transition = handleOnStreakToEligible(newState, dayBucket);
        newState = transition.newState;
        stateTransition = transition.stateTransition;
      }
      // Non-working days don't affect onStreak status
      break;

    case RecoveryStatusType.ELIGIBLE: {
      const missedDate = getEligibleMissedDate(currentState);
      const isValidRecovery = isValidRecoveryDay(dayBucket, missedDate);

      // Debug recovery validation
      if (dayBucket.kstDateString >= '2025-07-25' && dayBucket.kstDateString <= '2025-07-27') {
        console.log(`RECOVERY CHECK ${dayBucket.kstDateString}:`, {
          missedDate,
          dayOfWeek: new Date(dayBucket.kstDateString).getDay(),
          isWorkingDay: dayBucket.isWorkingDay,
          isValidRecovery,
          willProcess: dayBucket.isWorkingDay || isValidRecovery,
        });
      }

      // REQ-012: If this is a working day with no posts, update to track most recent miss
      if (dayBucket.isWorkingDay && !streakSatisfied) {
        const transition = handleEligibleToMostRecentMiss(newState, dayBucket);
        newState = transition.newState;
        stateTransition = transition.stateTransition;
      } else if (dayBucket.isWorkingDay || isValidRecovery) {
        const transition = handleEligibleDay(newState, dayBucket, postsCount);
        newState = transition.newState;
        stateTransition = transition.stateTransition;
        recoveryProgress = transition.recoveryProgress;
      } else {
        // Check if deadline has passed
        const deadlineCheck = checkEligibleDeadline(newState, dayBucket);
        if (deadlineCheck.deadlinePassed) {
          newState = deadlineCheck.newState;
          stateTransition = deadlineCheck.stateTransition;
        }
      }
      break;
    }

    case RecoveryStatusType.MISSED:
      if (streakSatisfied) {
        // Start building new streak
        newState = handleMissedToNewStreak(newState, dayBucket);
        stateTransition = { from: 'missed', to: 'onStreak', reason: 'new streak started' };
      } else if (dayBucket.isWorkingDay) {
        // REQ-012: Another working day missed - update to track most recent miss only
        const transition = handleMissedToEligible(newState, dayBucket);
        newState = transition.newState;
        stateTransition = transition.stateTransition;
      }
      break;
  }

  // Update longestStreak if current streak is higher
  newState = updateLongestStreakInSimulation(newState);

  // Update last contribution date if there were posts
  if (postsCount > 0) {
    newState.lastContributionDate = dayBucket.kstDateString;
  }

  return {
    date: dayBucket.kstDateString,
    wasWorkingDay: dayBucket.isWorkingDay,
    postsCount,
    streakSatisfied,
    stateTransition,
    recoveryProgress,
    newState,
  };
}

/**
 * Handle onStreak status continuation with streak increment
 * REQ-109: Update longestStreak when currentStreak increases
 */
function handleOnStreakToContinue(state: SimulationState, dayBucket: DayBucket): SimulationState {
  return {
    ...state,
    currentStreak: state.currentStreak + 1,
    // PRD: originalStreak는 onStreak → eligible 전환 시 캡쳐된 값으로 유지
    // onStreak 진행 중에는 증가시키지 않습니다
    originalStreak: state.originalStreak,
    lastContributionDate: dayBucket.kstDateString,
  };
}

/**
 * Handle onStreak → eligible transition when user misses a working day
 * REQ-107: Capture originalStreak = currentStreak during transition
 */
function handleOnStreakToEligible(
  state: SimulationState,
  dayBucket: DayBucket,
): {
  newState: SimulationState;
  stateTransition: { from: string; to: string; reason: string };
} {
  const recoveryWindow = calculateHistoricalRecoveryWindow(dayBucket.kstDateString);
  const missedDateTimestamp = Timestamp.fromDate(
    new Date(`${dayBucket.kstDateString}T00:00:00+09:00`),
  );

  return {
    newState: {
      ...state,
      status: {
        type: RecoveryStatusType.ELIGIBLE,
        postsRequired: recoveryWindow.postsRequired,
        currentPosts: 0,
        deadline: Timestamp.fromDate(new Date(`${recoveryWindow.eligibleDate}T23:59:59+09:00`)),
        missedDate: missedDateTimestamp,
      },
      currentStreak: 0, // Reset immediately per PRD
      originalStreak: state.currentStreak, // Preserve for recovery
    },
    stateTransition: {
      from: 'onStreak',
      to: 'eligible',
      reason: `missed working day ${dayBucket.kstDateString}`,
    },
  };
}

/**
 * Handle eligible day processing with recovery progress
 * REQ-108: Same-day return path and recovery completion logic
 */
function handleEligibleDay(
  state: SimulationState,
  dayBucket: DayBucket,
  postsCount: number,
): {
  newState: SimulationState;
  stateTransition?: { from: string; to: string; reason: string };
  recoveryProgress: { required: number; written: number; completed: boolean };
} {
  const status = state.status;
  if (status.type !== RecoveryStatusType.ELIGIBLE || !status.postsRequired) {
    throw new Error('Invalid state for eligible day processing');
  }

  const missedDateString = getEligibleMissedDate(state);
  const contributingPosts = countRecoveryContributingPosts(dayBucket, missedDateString);
  const totalPostsWritten = (status.currentPosts || 0) + contributingPosts;

  const recoveryProgress = {
    required: status.postsRequired,
    written: totalPostsWritten,
    completed: totalPostsWritten >= status.postsRequired,
  };

  if (recoveryProgress.completed) {
    // Recovery completed!
    const recoveryWindow = calculateHistoricalRecoveryWindow(missedDateString);
    let newCurrentStreak: number;

    if (recoveryWindow.isWorkingDayRecovery) {
      // Policy(v2): Weekday recovery adds 2 (missed day + recovery day)
      newCurrentStreak = state.originalStreak + 2;
    } else {
      // Friday → Saturday recovery remains +1
      newCurrentStreak = state.originalStreak + 1;
    }

    return {
      newState: {
        ...state,
        status: { type: RecoveryStatusType.ON_STREAK },
        currentStreak: newCurrentStreak,
        // originalStreak stays the same (captured at miss). It will be updated on next miss capture
      },
      stateTransition: {
        from: 'eligible',
        to: 'onStreak',
        reason: 'recovery completed',
      },
      recoveryProgress,
    };
  } else {
    // Update progress but stay eligible
    // REQ-008: Reflect partial progress in currentStreak
    return {
      newState: {
        ...state,
        status: {
          ...status,
          currentPosts: totalPostsWritten,
        },
        // Update currentStreak to reflect progress made since the miss
        currentStreak: totalPostsWritten,
      },
      recoveryProgress,
    };
  }
}

/**
 * Check if eligible deadline has passed and handle failure
 * REQ-107: Failure carry with partial progress and originalStreak=0
 */
function checkEligibleDeadline(
  state: SimulationState,
  dayBucket: DayBucket,
): {
  deadlinePassed: boolean;
  newState: SimulationState;
  stateTransition?: { from: string; to: string; reason: string };
} {
  const status = state.status;
  if (status.type !== RecoveryStatusType.ELIGIBLE || !status.deadline) {
    return { deadlinePassed: false, newState: state };
  }

  const currentTime = new Date(`${dayBucket.kstDateString}T00:00:00+09:00`);
  const deadlinePassed = currentTime.getTime() > status.deadline.toDate().getTime();

  if (deadlinePassed) {
    // Transition to missed with partial carry
    const partialStreak = Math.min(status.currentPosts || 0, 1); // Carry at most 1

    return {
      deadlinePassed: true,
      newState: {
        ...state,
        status: { type: RecoveryStatusType.MISSED },
        currentStreak: partialStreak, // Partial carry
        originalStreak: 0, // Reset on failure
      },
      stateTransition: {
        from: 'eligible',
        to: 'missed',
        reason: 'recovery deadline passed',
      },
    };
  }

  return { deadlinePassed: false, newState: state };
}

/**
 * Handle missed → onStreak transition when starting new streak
 */
function handleMissedToNewStreak(state: SimulationState, dayBucket: DayBucket): SimulationState {
  return {
    ...state,
    status: { type: RecoveryStatusType.ON_STREAK },
    currentStreak: 1, // New streak starts at 1
    originalStreak: 1,
  };
}

/**
 * Handle missed → eligible transition when another working day is missed
 * REQ-012: Only most recent missed day can be recovered
 */
function handleMissedToEligible(
  state: SimulationState,
  dayBucket: DayBucket,
): {
  newState: SimulationState;
  stateTransition: { from: string; to: string; reason: string };
} {
  const recoveryWindow = calculateHistoricalRecoveryWindow(dayBucket.kstDateString);
  const missedDateTimestamp = Timestamp.fromDate(
    new Date(`${dayBucket.kstDateString}T00:00:00+09:00`),
  );

  return {
    newState: {
      ...state,
      status: {
        type: RecoveryStatusType.ELIGIBLE,
        postsRequired: recoveryWindow.postsRequired,
        currentPosts: 0,
        deadline: Timestamp.fromDate(new Date(`${recoveryWindow.eligibleDate}T23:59:59+09:00`)),
        missedDate: missedDateTimestamp,
      },
      currentStreak: 0, // Reset streak
      originalStreak: 0, // No previous streak to recover to
    },
    stateTransition: {
      from: 'missed',
      to: 'eligible',
      reason: `new missed working day ${dayBucket.kstDateString}`,
    },
  };
}

/**
 * Handle eligible → eligible transition when another working day is missed
 * REQ-012: Only most recent missed day can be recovered - update to track new miss
 * When another miss occurs, the previous miss becomes unrecoverable (permanent break)
 */
function handleEligibleToMostRecentMiss(
  state: SimulationState,
  dayBucket: DayBucket,
): {
  newState: SimulationState;
  stateTransition: { from: string; to: string; reason: string };
} {
  const recoveryWindow = calculateHistoricalRecoveryWindow(dayBucket.kstDateString);
  const missedDateTimestamp = Timestamp.fromDate(
    new Date(`${dayBucket.kstDateString}T00:00:00+09:00`),
  );

  return {
    newState: {
      ...state,
      status: {
        type: RecoveryStatusType.ELIGIBLE,
        postsRequired: recoveryWindow.postsRequired,
        currentPosts: 0, // Reset progress for new miss
        deadline: Timestamp.fromDate(new Date(`${recoveryWindow.eligibleDate}T23:59:59+09:00`)),
        missedDate: missedDateTimestamp,
      },
      // Reset originalStreak based on progress built since the last break
      // This accounts for posts made after the previous (now unrecoverable) miss
      originalStreak: state.currentStreak,
      currentStreak: 0, // Reset for new miss
    },
    stateTransition: {
      from: 'eligible',
      to: 'eligible',
      reason: `updated to track most recent miss ${dayBucket.kstDateString}`,
    },
  };
}

/**
 * Update longestStreak if current streak exceeds it
 * REQ-109: Track and update longestStreak during simulation
 */
export function updateLongestStreakInSimulation(state: SimulationState): SimulationState {
  if (state.currentStreak > state.longestStreak) {
    return {
      ...state,
      longestStreak: state.currentStreak,
    };
  }

  return state;
}

/**
 * Calculate streak transition based on current state and day data
 * Pure function for testing state transition logic
 */
export function calculateStreakTransition(
  currentState: SimulationState,
  dayBucket: DayBucket,
): {
  newState: SimulationState;
  transition?: { from: string; to: string; reason: string };
} {
  // This is a simplified version for testing - the full logic is in processSimulationDay
  const postsCount = dayBucket.events.length;

  if (currentState.status.type === RecoveryStatusType.ON_STREAK) {
    if (dayBucket.isWorkingDay && postsCount > 0) {
      return {
        newState: {
          ...currentState,
          currentStreak: currentState.currentStreak + 1,
        },
      };
    }
  }

  return { newState: currentState };
}

/**
 * Helper: Extract missed date from eligible status
 */
function getEligibleMissedDate(state: SimulationState): string {
  if (state.status.type !== RecoveryStatusType.ELIGIBLE || !state.status.missedDate) {
    throw new Error('Invalid state: not eligible or missing missedDate');
  }

  // Extract date in KST timezone to avoid UTC conversion issues
  const missedDate = state.status.missedDate.toDate();
  return missedDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

/**
 * Create recovery event from day simulation result
 * Needs access to the previous state to get the missed date
 */
function createRecoveryFromDayResult(
  dayBucket: DayBucket,
  dayResult: DaySimulationResult,
  previousState: SimulationState,
): RecoveryEvent | null {
  if (!dayResult.recoveryProgress?.completed) {
    return null;
  }

  // Extract missed date from previous eligible state
  let missedDateString: string;
  if (
    previousState.status.type === RecoveryStatusType.ELIGIBLE &&
    previousState.status.missedDate
  ) {
    missedDateString = previousState.status.missedDate
      .toDate()
      .toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  } else {
    console.warn('Could not extract missed date for recovery event');
    return null;
  }

  return createRecoveryEventFromSimulation(
    missedDateString,
    dayBucket.kstDateString,
    dayResult.recoveryProgress.required,
    dayResult.recoveryProgress.written,
  );
}

/**
 * Calculate comprehensive simulation statistics
 */
function calculateSimulationStats(
  dayResults: DaySimulationResult[],
  recoveryEvents: RecoveryEvent[],
  processingTimeMs: number,
): SimulationStats {
  const postsProcessed = dayResults.reduce((sum, day) => sum + day.postsCount, 0);
  const successfulRecoveries = recoveryEvents.filter((e) => e.successful).length;

  return {
    postsProcessed,
    daysSimulated: dayResults.length,
    recoveries: successfulRecoveries,
    batches: 1, // Simplified - would be calculated based on actual batching
    batchResults: [
      {
        batchNumber: 1,
        eventsProcessed: postsProcessed,
        startDate: dayResults[0]?.date || '',
        endDate: dayResults[dayResults.length - 1]?.date || '',
      },
    ],
    processingTimeMs,
  };
}

/**
 * Generate complete day timeline including missing days
 * Creates empty day buckets for days without posts to ensure proper gap detection
 */
function generateCompleteDayTimeline(
  dayBuckets: DayBucket[],
  horizonEndKstDateString?: string,
): DayBucket[] {
  if (dayBuckets.length === 0) {
    return [];
  }

  // Sort day buckets by date
  const sortedBuckets = [...dayBuckets].sort((a, b) =>
    a.kstDateString.localeCompare(b.kstDateString),
  );

  // Create map of existing days
  const existingDays = new Map<string, DayBucket>();
  sortedBuckets.forEach((bucket) => {
    existingDays.set(bucket.kstDateString, bucket);
  });

  // Generate complete timeline from first to last day (or horizon if provided)
  const startDate = new Date(sortedBuckets[0].kstDateString + 'T00:00:00+09:00');
  const lastBucketEnd = new Date(
    sortedBuckets[sortedBuckets.length - 1].kstDateString + 'T00:00:00+09:00',
  );
  const endDate = horizonEndKstDateString
    ? new Date(horizonEndKstDateString + 'T00:00:00+09:00')
    : lastBucketEnd;

  const completeBuckets: DayBucket[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Format date in KST timezone to avoid timezone conversion issues
    const kstDateString = currentDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

    if (existingDays.has(kstDateString)) {
      // Use existing day bucket
      completeBuckets.push(existingDays.get(kstDateString)!);
    } else {
      // Create empty day bucket for missing day
      const emptyBucket: DayBucket = {
        kstDateString,
        kstDate: new Date(currentDate),
        events: [],
        isWorkingDay: isWorkingDayInKst(currentDate),
      };
      completeBuckets.push(emptyBucket);
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return completeBuckets;
}

/**
 * Check if a date is a working day in KST timezone
 * Working days are Monday-Friday (excluding weekends)
 */
function isWorkingDayInKst(date: Date): boolean {
  // Convert to KST if needed
  const kstDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const dayOfWeek = kstDate.getDay(); // 0 = Sunday, 6 = Saturday
  return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
}
