/**
 * Retroactive Streak Backfill - Main Module
 * 
 * Entry point for the backfill system with complete functionality
 * for reconstructing streak states from historical posting data.
 */

export * from './types';
export * from './recoveryIdUtils';
export * from './eventExtraction';
export * from './kstCalendarLogic';
export * from './simulationEngine';
export * from './recoveryHistoryGeneration';

// Main backfill process function for HTTP handler
export async function runBackfillProcess(params: import('./types').BackfillParams): Promise<import('./types').BackfillResponse> {
  const { extractPostingEvents, groupEventsByDay, getEarliestPostingDate } = await import('./eventExtraction');
  const { simulateHistoricalStreak } = await import('./simulationEngine');
  const { buildRecoveryHistoryForSimulation } = await import('./recoveryHistoryGeneration');
  const { writeBackfillResults } = await import('./firestoreIntegration');
  
  const startTime = Date.now();
  
  try {
    // Step 1: Determine simulation date range
    let fromDate = params.fromDate;
    if (!fromDate) {
      const earliestDate = await getEarliestPostingDate(params.userId);
      if (!earliestDate) {
        // User has no postings - return zero state
        return createEmptyBackfillResponse(params);
      }
      fromDate = earliestDate;
    }
    
    // Step 2: Extract and process posting events
    const postingEvents = await extractPostingEvents(params.userId, fromDate, params.asOfDate);
    
    if (!postingEvents.length) {
      return createEmptyBackfillResponse(params);
    }
    
    // Step 3: Group events into daily buckets
    const dayBuckets = groupEventsByDay(postingEvents);
    
    // Step 4: Run day-by-day simulation
    const initialState = await createInitialSimulationState();
    const simulationResult = await simulateHistoricalStreak(dayBuckets, initialState);
    
    // Step 5: Generate recovery history with deterministic IDs
    const recoveryEvents = buildRecoveryHistoryForSimulation(simulationResult);
    
    // Step 6: Prepare writes or return dry-run response
    const backfillWrites = {
      streakInfo: simulationResult.finalState,
      recoveryHistory: recoveryEvents,
      recoveriesToDelete: [], // Will be handled by deleteExistingRecoveryHistory
    };
    
    const writeResult = await writeBackfillResults(params, backfillWrites);
    
    // Step 7: Format final response
    const processingTime = Date.now() - startTime;
    
    return {
      userId: params.userId,
      from: fromDate.toISOString().split('T')[0],
      asOf: formatKstDateTime(params.asOfDate),
      finalState: {
        status: simulationResult.finalState.status.type,
        currentStreak: simulationResult.finalState.currentStreak,
        longestStreak: simulationResult.finalState.longestStreak,
        originalStreak: simulationResult.finalState.originalStreak,
      },
      recoveryEvents: writeResult.recoveryEvents,
      stats: {
        ...simulationResult.stats,
        processingTimeMs: processingTime,
      },
    };
    
  } catch (error) {
    console.error(`[BackfillProcess] Error for user ${params.userId}:`, error);
    throw error;
  }
}

// Helper functions
function createEmptyBackfillResponse(params: import('./types').BackfillParams): import('./types').BackfillResponse {
  return {
    userId: params.userId,
    from: params.fromDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
    asOf: formatKstDateTime(params.asOfDate),
    finalState: {
      status: 'missed',
      currentStreak: 0,
      longestStreak: 0,
      originalStreak: 0,
    },
    recoveryEvents: [],
    stats: {
      postsProcessed: 0,
      daysSimulated: 0,
      recoveries: 0,
      batches: 0,
      batchResults: [],
      processingTimeMs: 0,
    },
  };
}

async function createInitialSimulationState(): Promise<import('./types').SimulationState> {
  const { Timestamp } = await import('firebase-admin/firestore');
  const { RecoveryStatusType } = await import('../recoveryStatus/StreakInfo');
  
  return {
    status: { type: RecoveryStatusType.MISSED },
    currentStreak: 0,
    longestStreak: 0,
    originalStreak: 0,
    lastContributionDate: '',
    lastCalculated: Timestamp.now(),
  };
}

function formatKstDateTime(date: Date): string {
  return date.toLocaleString('sv-SE', { 
    timeZone: 'Asia/Seoul',
    timeZoneName: 'short'
  }).replace(' ', 'T') + 'KST';
}