import { Timestamp } from 'firebase-admin/firestore';

/**
 * Domain Models for Contribution Grid Feature
 * Contains pure data structures and value objects
 */

/**
 * Represents a single day's contribution in the grid
 */
export interface ContributionDay {
  /** Date in YYYY-MM-DD format */
  day: string;
  /** Contribution value (posting length or comment count) */
  value: number;
  /** Week number (0-3 for 4 weeks) */
  week: number;
  /** Column number (0-4 for Monday-Friday) */
  column: number;
}

/**
 * Represents the complete contribution grid for a user
 */
export interface ContributionGrid {
  /** Array of contribution days */
  contributions: ContributionDay[];
  /** Maximum value in the grid for scaling */
  maxValue: number;
  /** Last update timestamp */
  lastUpdated: Timestamp;
  /** Time range covered by this grid */
  timeRange: {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  };
}

/**
 * Activity types that contribute to the grid
 */
export enum ActivityType {
  POSTING = 'posting',
  COMMENTING = 'commenting',
}

/**
 * Contribution grid update data for database operations
 */
export interface ContributionGridUpdate {
  userId: string;
  activityType: ActivityType;
  date: string; // YYYY-MM-DD
  value: number;
  reason: string;
  maxValue: number;
  lastUpdated: Timestamp;
  timeRange: {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  };
}

/**
 * Simple timestamp for pure functions (without Firebase dependency)
 */
export interface SimpleTimestamp {
  seconds: number;
  nanoseconds: number;
}

/**
 * Date range for contribution grid calculations
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Week and column position in grid
 */
export interface GridPosition {
  week: number;
  column: number;
}