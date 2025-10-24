import { Event } from '../../types/Event';
import { StreamProjectionPhase2 } from '../../types/StreamProjectionPhase2';

/**
 * Request options for explain API with sequence range filtering.
 */
export interface ExplainProjectionOptions {
  fromSeq?: number; // Filter events from this sequence (inclusive)
  toSeq?: number; // Filter events to this sequence (inclusive)
  includeEvents?: boolean; // Include full event objects in response
}

/**
 * Main response structure for explain API.
 */
export interface ExplainProjectionResponse {
  finalProjection: StreamProjectionPhase2;
  eventExplanations: EventExplanation[];
  summary: ExplanationSummary;
}

/**
 * Explanation for a single event's effect on projection state.
 */
export interface EventExplanation {
  seq: number;
  type: 'PostCreated' | 'PostDeleted' | 'TimezoneChanged' | 'DayClosed';
  dayKey: string;
  isVirtual: boolean;
  stateBefore: StreakSnapshot;
  stateAfter: StreakSnapshot;
  changes: EventChange[];
  event?: Event; // Optional: include if options.includeEvents = true
}

/**
 * Snapshot of projection state at a specific point in time.
 */
export interface StreakSnapshot {
  status: string;
  currentStreak: number;
  originalStreak: number;
  longestStreak: number;
  lastContributionDate: string | null;
  eligibleContext?: {
    postsRequired: number;
    currentPosts: number;
    deadline: string;
    missedDate: string;
  };
  // missedContext removed in phase2.1-no-crossday-v1 (no cross-day rebuild tracking)
  // @deprecated - kept for backward compatibility with old explain API responses
  missedContext?: {
    missedPostDates: string[];
  };
}

/**
 * Individual field change with explanation.
 */
export interface EventChange {
  field: string;
  before: any;
  after: any;
  reason: string;
}

/**
 * Summary statistics for the explanation.
 */
export interface ExplanationSummary {
  totalEvents: number;
  virtualClosures: number;
  statusTransitions: number;
  streakChanges: number;
  evaluatedPeriod: {
    start: string;
    end: string;
  };
}
