/**
 * Contribution Grid Utilities - Facade Module
 *
 * This file re-exports all grid utilities from the grid/ subdirectory
 * for backward compatibility. New code should import directly from
 * '@/stats/utils/grid' or specific submodules.
 */

export {
  // Types and constants
  WEEKS_TO_DISPLAY,
  type ContributionData,
  type ContributionMatrix,
  type ContributionDataMatrix,
  type GridPosition,
  type GridResult,
  // Time range functions
  getTimeRange,
  filterContributionsInTimeRange,
  // Grid position functions
  calculateGridPosition,
  filterWeekdayContributions,
  // Matrix functions
  createEmptyMatrices,
  createEmptyGridResult,
  // Placeholder functions
  initializeGridWithPlaceholders,
  // Processing functions
  placeContributionInGrid,
  processContributionsInGrid,
  processPostingContributions,
  processCommentingContributions,
} from './grid';
