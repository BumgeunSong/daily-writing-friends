import { ContributionDay, ContributionGrid } from './models';

/**
 * Domain Validators for Contribution Grid Feature
 * Contains validation logic for domain models
 */

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

/**
 * Validates a date string in YYYY-MM-DD format
 */
export function validateDateString(dateString: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  // Check if the date is valid
  const date = new Date(dateString);
  return date.toISOString().slice(0, 10) === dateString;
}