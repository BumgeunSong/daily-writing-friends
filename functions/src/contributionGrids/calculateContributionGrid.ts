/**
 * @deprecated This file has been restructured into domain layer.
 * Use the new service layer instead: ./services/contributionGridService.ts
 */

// Re-export from new structure for backward compatibility
export * from './domain/gridCalculator';

// Legacy type for backward compatibility
export type ContributionGridDBUpdate = import('./domain/models').ContributionGridUpdate;
