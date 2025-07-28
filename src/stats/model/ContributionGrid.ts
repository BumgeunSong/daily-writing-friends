import { Timestamp } from 'firebase/firestore';

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
 * Hook return type for contribution grid data
 */
export interface ContributionGridData {
  /** Posting contribution grid */
  postingGrid: ContributionGrid | null;
  /** Commenting contribution grid */
  commentingGrid: ContributionGrid | null;
  /** Maximum value across both grids for scaling */
  maxValue: number;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: Error | null;
}
