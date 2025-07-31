/**
 * Utility functions and helpers for Contribution Grid feature
 * Re-exports from domain layer for backward compatibility
 */

// Domain models and types
export * from '../domain/models';

// Domain validators
export * from '../domain/validators';

// Grid calculation utilities
export * from '../domain/gridCalculator';

// Grid builder utilities
export * from '../domain/gridBuilder';

// Legacy types for backward compatibility
export { ActivityType } from '../domain/models';
export type { ContributionDay, ContributionGrid } from '../domain/models';