/**
 * TypeScript interfaces for Retroactive Streak Backfill functionality
 * 
 * Defines types for HTTP parameters, simulation state, and response structures
 * per the backfill PRD requirements.
 */

import { Timestamp } from 'firebase-admin/firestore';
import { RecoveryStatus } from '../recoveryStatus/StreakInfo';

/**
 * HTTP Cloud Function request parameters
 * REQ-101: userId (required), asOf (optional), from (optional), dryRun (optional)
 */
export interface BackfillRequestParams {
  userId: string; // Required: target user for backfill
  asOf?: string; // Optional: KST date/time horizon (ISO format)
  from?: string; // Optional: start date (YYYY-MM-DD)
  dryRun?: boolean; // Optional: preview mode without writes (default false)
}

/**
 * Validated and parsed request parameters
 * Internal representation after validation
 */
export interface BackfillParams {
  userId: string;
  asOfDate: Date; // Parsed asOf or current KST time
  fromDate?: Date; // Parsed from date or earliest posting
  dryRun: boolean;
}

/**
 * Raw posting event extracted from Firestore
 * Represents a single posting with server timestamp
 */
export interface PostingEvent {
  id: string;
  boardId: string;
  title: string;
  contentLength: number;
  serverTimestamp: Timestamp; // Server-side creation time
  kstTimestamp: Date; // Converted to KST for processing
  kstDateString: string; // YYYY-MM-DD in KST
}

/**
 * Events grouped by KST calendar day
 * REQ-105: Group events by KST day, first post satisfies streak
 */
export interface DayBucket {
  kstDateString: string; // YYYY-MM-DD
  kstDate: Date;
  isWorkingDay: boolean;
  events: PostingEvent[];
}

/**
 * Simulation state at any point in time
 * Tracks current streak status during day-by-day processing
 */
export interface SimulationState {
  status: RecoveryStatus;
  currentStreak: number;
  longestStreak: number;
  originalStreak: number;
  lastContributionDate: string; // YYYY-MM-DD
  lastCalculated: Timestamp;
}

/**
 * Recovery event for simulation and response
 * Tracks recovery attempts during backfill simulation
 */
export interface RecoveryEvent {
  missedDate: string; // YYYY-MM-DD
  recoveryDate: string; // YYYY-MM-DD
  postsRequired: number;
  postsWritten: number;
  recoveryId: string; // FNV-1a hash for determinism
  successful: boolean;
}

/**
 * Batch processing result
 * REQ-113: Process in batches of 200
 */
export interface BatchResult {
  batchNumber: number;
  eventsProcessed: number;
  startDate: string; // First event date in batch
  endDate: string; // Last event date in batch
}

/**
 * Simulation statistics for response
 * Provides insights into processing metrics
 */
export interface SimulationStats {
  postsProcessed: number;
  daysSimulated: number;
  recoveries: number; // Successful recoveries
  batches: number;
  batchResults: BatchResult[];
  processingTimeMs: number;
}

/**
 * Dry-run response body structure
 * REQ-111: Specific JSON format for dry-run mode
 */
export interface BackfillResponse {
  userId: string;
  from: string; // YYYY-MM-DD
  asOf: string; // YYYY-MM-DDTHH:mm:ssKST
  finalState: {
    status: string; // RecoveryStatusType as string
    currentStreak: number;
    longestStreak: number;
    originalStreak: number;
  };
  recoveryEvents: RecoveryEvent[];
  stats: SimulationStats;
}

/**
 * Day processing result
 * Result of simulating one calendar day
 */
export interface DaySimulationResult {
  date: string; // YYYY-MM-DD
  wasWorkingDay: boolean;
  postsCount: number;
  streakSatisfied: boolean;
  stateTransition?: {
    from: string;
    to: string;
    reason: string;
  };
  recoveryProgress?: {
    required: number;
    written: number;
    completed: boolean;
  };
  newState: SimulationState;
}

/**
 * Complete simulation result
 * Full result of running backfill simulation
 */
export interface SimulationResult {
  initialState: SimulationState;
  finalState: SimulationState;
  dayResults: DaySimulationResult[];
  recoveryEvents: RecoveryEvent[];
  stats: SimulationStats;
}

/**
 * Firestore write operations for non-dry-run mode
 * Defines what needs to be written to database
 */
export interface BackfillWrites {
  streakInfo: SimulationState;
  recoveryHistory: RecoveryEvent[];
  recoveriesToDelete: string[]; // Existing recovery IDs to remove
}

/**
 * Error types for backfill operations
 */
export enum BackfillErrorType {
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  TOO_MANY_POSTINGS = 'TOO_MANY_POSTINGS',
  FIRESTORE_ERROR = 'FIRESTORE_ERROR',
  SIMULATION_ERROR = 'SIMULATION_ERROR',
}

/**
 * Backfill error with context
 */
export interface BackfillError {
  type: BackfillErrorType;
  message: string;
  details?: any;
}

/**
 * Internal constants for backfill processing
 */
export const BACKFILL_CONSTANTS = {
  MAX_POSTINGS_PER_USER: 500,
  BATCH_SIZE: 200,
  DEFAULT_TIMEOUT_MS: 540000, // 9 minutes (within Cloud Function limit)
  KST_TIMEZONE: 'Asia/Seoul',
} as const;