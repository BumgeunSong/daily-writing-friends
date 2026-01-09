// Types and constants
export {
  WEEKS_TO_DISPLAY,
  WEEKDAYS_COUNT,
  DAYS_PER_WEEK,
  SUNDAY,
  SATURDAY,
  MILLISECONDS_PER_DAY,
  type ContributionData,
  type ContributionMatrix,
  type ContributionDataMatrix,
  type GridPosition,
  type GridResult,
  type DateLike,
  type HasCreatedAt,
} from './types';

// Time range functions
export { getTimeRange, filterContributionsInTimeRange } from './timeRange';

// Grid position functions
export {
  calculateGridPosition,
  filterWeekdayContributions,
} from './gridPosition';

// Matrix functions
export {
  createEmptyMatrices,
  createEmptyGridResult,
} from './gridMatrix';

// Placeholder functions
export { initializeGridWithPlaceholders } from './placeholders';

// Processing functions
export {
  placeContributionInGrid,
  processContributionsInGrid,
  processPostingContributions,
  processCommentingContributions,
} from './processors';
