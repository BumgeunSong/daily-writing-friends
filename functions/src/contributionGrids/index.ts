/**
 * Main entry point for Contribution Grid feature
 * Exports all public APIs and Cloud Functions
 */

// Cloud Functions (Controllers)
export { 
  updatePostingContributionGrid, 
  updateCommentingContributionGrid 
} from './controllers/contributionGridController';

export { 
  backfillContributionGrids 
} from './controllers/backfillController';

// Services (for internal use by other features)
export { ContributionGridService } from './services/contributionGridService';
export { BackfillService } from './services/backfillService';

// Pure business logic functions (for testing and reuse)
export * from './services/contributionGridBusinessLogic';

// Repositories (for internal use)
export { ContributionGridRepository } from './repository/contributionGridRepository';
export { UserActivityRepository } from './repository/userActivityRepository';

// Domain models and utilities (public API)
export * from './utils';

// Types for external consumption
export type { BackfillResult, BackfillOptions, UserData, UserGridUpdate } from './services/backfillService';