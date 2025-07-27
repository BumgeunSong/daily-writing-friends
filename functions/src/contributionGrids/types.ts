import { Timestamp } from 'firebase-admin/firestore';

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
 * Validates a ContributionDay object
 */
export function validateContributionDay(day: ContributionDay): boolean {
  // Check required fields
  if (
    !day.day ||
    typeof day.value !== 'number' ||
    typeof day.week !== 'number' ||
    typeof day.column !== 'number'
  ) {
    return false;
  }

  // Validate day format (YYYY-MM-DD)
  const dayRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dayRegex.test(day.day)) {
    return false;
  }

  // Validate value range
  if (day.value < 0) {
    return false;
  }

  // Validate week range (0-3)
  if (day.week < 0 || day.week > 3) {
    return false;
  }

  // Validate column range (0-4)
  if (day.column < 0 || day.column > 4) {
    return false;
  }

  return true;
}

/**
 * Validates a ContributionGrid object
 */
export function validateContributionGrid(grid: ContributionGrid): boolean {
  // Check required fields
  if (
    !grid.contributions ||
    !Array.isArray(grid.contributions) ||
    typeof grid.maxValue !== 'number' ||
    !grid.lastUpdated ||
    !grid.timeRange ||
    !grid.timeRange.startDate ||
    !grid.timeRange.endDate
  ) {
    return false;
  }

  // Validate contributions array is not empty
  if (grid.contributions.length === 0) {
    return false;
  }

  // Validate maxValue
  if (grid.maxValue < 0) {
    return false;
  }

  // Validate timeRange format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(grid.timeRange.startDate) || !dateRegex.test(grid.timeRange.endDate)) {
    return false;
  }

  // Validate timeRange order
  if (grid.timeRange.startDate > grid.timeRange.endDate) {
    return false;
  }

  // Validate all contribution days
  for (const contribution of grid.contributions) {
    if (!validateContributionDay(contribution)) {
      return false;
    }
  }

  return true;
}
