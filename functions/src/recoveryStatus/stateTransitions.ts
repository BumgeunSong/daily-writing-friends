/**
 * Streak Recovery State Transitions
 * 
 * This module provides a clean API for handling user streak state transitions
 * in the recovery system. It orchestrates transitions between the 3 states:
 * - onStreak: User is maintaining their writing streak
 * - eligible: User missed a day but can still recover  
 * - missed: User failed to recover and must rebuild their streak
 *
 * Architecture:
 * - transitionLogic.ts: Pure functions containing core business logic
 * - transitionWrappers.ts: Database wrapper functions
 * - transitionOrchestrators.ts: High-level orchestration functions
 * - recoveryUtils.ts: Utility functions for recovery operations
 */

// Re-export core types for backward compatibility
export { DBUpdate } from './transitionHelpers';

// Re-export pure transition functions (for testing)
export {
  calculateOnStreakToEligiblePure,
  calculateEligibleToOnStreakPure,
  calculateEligibleToMissedPure,
  calculateMissedToOnStreakPure,
  calculateMidnightStreakMaintenancePure,
} from './transitionLogic';

// Re-export database wrapper functions
export {
  calculateOnStreakToEligible,
  calculateEligibleToOnStreak,
  calculateEligibleToMissed,
  calculateMissedToOnStreak,
  calculateOnStreakToOnStreak,
  calculateMidnightStreakMaintenance,
  calculateMissedStateMaintenance,
} from './transitionWrappers';

// Re-export orchestrator functions (main API)
export {
  calculatePostingTransitions,
  calculateMidnightTransitions,
  getCurrentStreakStatus,
} from './transitionOrchestrators';

// Re-export utility functions
export {
  createRecoveryHistory,
  updateLongestStreak,
  isRecoveryDeadlinePassed,
  calculatePostsNeeded,
  isRecoveryOnTrack,
} from './recoveryUtils';