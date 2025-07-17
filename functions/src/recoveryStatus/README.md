# Recovery Status Midnight Update - Refactored Architecture

## Overview

The `updateRecoveryStatusOnMidnight` function has been refactored into smaller, pure functions that are easily testable and maintainable. This modular approach separates concerns and makes the codebase more robust.

## File Structure

```
src/recoveryStatus/
├── updateRecoveryStatusOnMidnight.ts  # Main scheduled function
├── midnightUpdateHelpers.ts           # Pure utility functions
├── userRecoveryProcessor.ts           # User processing logic
├── firestoreOperations.ts             # Database operations
├── updateRecoveryStatus.ts            # Existing status calculation logic
└── __tests__/
    └── midnightUpdateHelpers.test.ts  # Example tests for pure functions
```

## Architecture Benefits

### 1. **Separation of Concerns**
- **Firebase Functions wrapper**: `updateRecoveryStatusOnMidnight.ts`
- **Business logic**: `midnightUpdateHelpers.ts`
- **Data processing**: `userRecoveryProcessor.ts`
- **Database operations**: `firestoreOperations.ts`

### 2. **Pure Functions**
Most functions are now pure (no side effects), making them:
- **Easily testable** with predictable inputs/outputs
- **Reusable** across different contexts
- **Debuggable** with clear data flow

### 3. **Error Isolation**
- Individual user processing errors don't affect other users
- Firestore connection issues are handled gracefully
- Detailed error reporting with summaries

### 4. **Performance Optimization**
- Batch processing to avoid overwhelming the system
- Parallel processing within batches
- Health checks before processing

## Key Functions

### `midnightUpdateHelpers.ts` - Pure Utility Functions

#### `determineNewRecoveryStatus(currentStatus, calculatedStatus): RecoveryStatus`
**Pure function** that implements midnight transition logic:
```typescript
// Test example:
const newStatus = determineNewRecoveryStatus('partial', 'eligible');
// Returns: 'none' (failed recovery)
```

#### `createStatusTransitionLog(userId, currentStatus, newStatus, calculatedStatus): StatusTransitionLog`
**Pure function** that creates structured log messages:
```typescript
// Test example:
const log = createStatusTransitionLog('user123', 'partial', 'none', 'partial');
// Returns: { transitionType: 'reset', message: '...', ... }
```

#### `isValidUserRecoveryData(userData): boolean`
**Pure function** for data validation:
```typescript
// Test example:
const isValid = isValidUserRecoveryData({ userId: 'user123', currentStatus: 'eligible' });
// Returns: true
```

### `userRecoveryProcessor.ts` - Processing Logic

#### `processUserRecoveryStatus(userData, currentDate): Promise<UserProcessingResult>`
Processes a single user with error handling:
- Calculates recovery status
- Determines new status using pure functions
- Updates database if needed
- Returns structured result

#### `processUsersInBatches(users, currentDate, batchSize): Promise<UserProcessingResult[]>`
Processes multiple users efficiently:
- Splits users into batches
- Processes batches in parallel
- Provides progress logging

### `firestoreOperations.ts` - Database Layer

#### `fetchAndPrepareUsers(): Promise<UserRecoveryData[]>`
Fetches and validates user data:
- Retrieves all users from Firestore
- Converts to typed data structures
- Filters out invalid records

#### `checkFirestoreHealth(): Promise<boolean>`
Health check for database connection.

### `updateRecoveryStatusOnMidnight.ts` - Main Function

#### `executeMidnightUpdate(currentDate, batchSize): Promise<ProcessingSummary>`
**Core business logic** separated from Firebase Functions wrapper:
- Can be called directly for testing
- Returns detailed processing summary
- Handles all error scenarios

## Testing Strategy

### Unit Tests (Pure Functions)
```typescript
// Example: Testing transition logic
describe('determineNewRecoveryStatus', () => {
  it('should reset partial status to none when not successful', () => {
    const result = determineNewRecoveryStatus('partial', 'eligible');
    expect(result).toBe('none');
  });
});
```

### Integration Tests
```typescript
// Example: Testing core logic
describe('executeMidnightUpdate', () => {
  it('should process users correctly', async () => {
    const mockDate = new Date('2025-01-20T00:00:00+09:00');
    const summary = await executeMidnightUpdate(mockDate, 10);
    expect(summary.totalUsers).toBeGreaterThan(0);
  });
});
```

### Mock Testing
```typescript
// Example: Mocking Firestore operations
jest.mock('./firestoreOperations', () => ({
  fetchAndPrepareUsers: jest.fn().mockResolvedValue([mockUserData])
}));
```

## Usage Examples

### Running the Midnight Update Manually
```typescript
import { executeMidnightUpdate } from './updateRecoveryStatusOnMidnight';

// Run for specific date
const summary = await executeMidnightUpdate(
  new Date('2025-01-20T00:00:00+09:00'),
  25 // batch size
);

console.log(`Processed ${summary.totalUsers} users with ${summary.errors} errors`);
```

### Testing Individual Functions
```typescript
import { determineNewRecoveryStatus } from './midnightUpdateHelpers';

// Test transition logic
const scenarios = [
  { current: 'partial', calculated: 'eligible', expected: 'none' },
  { current: 'partial', calculated: 'success', expected: 'success' },
  { current: 'none', calculated: 'eligible', expected: 'eligible' }
];

scenarios.forEach(({ current, calculated, expected }) => {
  const result = determineNewRecoveryStatus(current, calculated);
  console.assert(result === expected, `Failed: ${current} + ${calculated} should be ${expected}`);
});
```

## Error Handling

### Graceful Degradation
- Individual user errors don't stop processing
- Firestore connection issues are caught early
- Detailed error logging and reporting

### Monitoring
```typescript
const summary = await executeMidnightUpdate();

// Monitor success rate
const successRate = summary.successfulUpdates / summary.totalUsers;
if (successRate < 0.95) {
  console.warn('Low success rate detected:', successRate);
}

// Alert on specific transition types
if (summary.transitionCounts.reset > summary.totalUsers * 0.1) {
  console.warn('High reset rate detected - many users failed recovery');
}
```

## Benefits of This Architecture

1. **🧪 Testability**: Pure functions are easy to unit test
2. **🔧 Maintainability**: Clear separation of concerns
3. **📊 Monitoring**: Detailed processing summaries
4. **⚡ Performance**: Batch processing and parallel execution
5. **🛡️ Reliability**: Error isolation and graceful degradation
6. **🔍 Debuggability**: Structured logging and data flow

This refactored architecture makes the midnight update function more reliable, testable, and maintainable while preserving all the original functionality.