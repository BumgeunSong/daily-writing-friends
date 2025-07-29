# Pure Functions Architecture for Contribution Grid Service

This document explains how the `ContributionGridService` has been refactored to use pure functions for core business logic, enabling easy output-based unit testing.

## Architecture Overview

### Before: Mixed Concerns
```typescript
class ContributionGridService {
  async processPostingContribution(userId: string, postingData: Posting): Promise<void> {
    // Side effects mixed with business logic
    const existingGrid = await this.repository.getGrid(userId, ActivityType.POSTING);
    const update = calculatePostingContributionUpdate(userId, postingData, existingGrid);
    if (update) {
      // More side effects...
      await this.repository.saveGrid(userId, update.activityType, updatedGrid);
    }
  }
}
```

### After: Pure Functions + Orchestration
```typescript
// Pure business logic (contributionGridBusinessLogic.ts)
export function calculatePostingContributionResult(
  userId: string, 
  postingData: Posting, 
  existingGrid: ContributionGrid | null
): { success: boolean; update?: ContributionGridUpdate; error?: string } {
  // Pure function - no side effects, deterministic output
}

// Service orchestration (contributionGridService.ts)
class ContributionGridService {
  async processPostingContribution(userId: string, postingData: Posting): Promise<{ success: boolean; error?: string }> {
    // Side effect: Get data
    const existingGrid = await this.repository.getGrid(userId, ActivityType.POSTING);
    
    // Pure function: Calculate result
    const result = calculatePostingContributionResult(userId, postingData, existingGrid);
    
    // Side effect: Apply result
    if (result.success && result.update) {
      await this.applyContributionGridUpdate(result.update);
    }
    
    return { success: result.success, error: result.error };
  }
}
```

## Pure Functions Extracted

### 1. `calculatePostingContributionResult`
**Input**: `userId`, `postingData`, `existingGrid`  
**Output**: `{ success: boolean; update?: ContributionGridUpdate; error?: string }`  
**Purpose**: Calculate the result of processing a posting contribution

### 2. `calculateCommentingContributionResult`
**Input**: `userId`, `commentingData`, `existingGrid`  
**Output**: `{ success: boolean; update?: ContributionGridUpdate; error?: string }`  
**Purpose**: Calculate the result of processing a commenting contribution

### 3. `calculateUpdatedGrid`
**Input**: `update`, `currentGrid`  
**Output**: `ContributionGrid`  
**Purpose**: Calculate the updated grid state from an update

### 4. `validateContributionUpdate`
**Input**: `update`  
**Output**: `{ isValid: boolean; errors: string[] }`  
**Purpose**: Validate contribution update data

### 5. `shouldProcessUpdate`
**Input**: `update`, `existingGrid`  
**Output**: `{ shouldProcess: boolean; reason: string }`  
**Purpose**: Determine if an update should be processed

### 6. `calculateBatchResult`
**Input**: `updates[]`  
**Output**: `{ totalUpdates: number; postingUpdates: number; commentingUpdates: number; userCount: number }`  
**Purpose**: Calculate statistics for batch operations

## Benefits for Testing

### 1. Output-Based Testing (No Mocks Required)
```typescript
describe('calculatePostingContributionResult', () => {
  it('should calculate posting contribution correctly', () => {
    // Arrange: Create input data
    const posting = createMockPosting(120);
    const existingGrid = createMockGrid();
    
    // Act: Call pure function
    const result = calculatePostingContributionResult('user-1', posting, existingGrid);
    
    // Assert: Check output
    expect(result.success).toBe(true);
    expect(result.update?.value).toBe(120);
    expect(result.update?.activityType).toBe(ActivityType.POSTING);
  });
});
```

### 2. Easy Edge Case Testing
```typescript
it('should handle null existing grid', () => {
  const posting = createMockPosting(80);
  const result = calculatePostingContributionResult('user-1', posting, null);
  
  expect(result.success).toBe(true);
  expect(result.update?.value).toBe(80);
});

it('should handle invalid posting data', () => {
  const invalidPosting = { ...createMockPosting(), createdAt: null };
  const result = calculatePostingContributionResult('user-1', invalidPosting, null);
  
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
});
```

### 3. Fast Test Execution
- No database setup required
- No async operations in core logic
- No external dependencies to mock

### 4. Comprehensive Coverage
```typescript
describe('validateContributionUpdate', () => {
  it('should detect missing userId', () => { /* ... */ });
  it('should detect invalid date format', () => { /* ... */ });
  it('should detect negative value', () => { /* ... */ });
  it('should validate correct update', () => { /* ... */ });
});
```

## Service Integration Testing

For integration testing, you can test the service with mocked repositories:

```typescript
describe('ContributionGridService Integration', () => {
  let service: ContributionGridService;
  let mockRepository: jest.Mocked<ContributionGridRepository>;

  beforeEach(() => {
    mockRepository = {
      getGrid: jest.fn(),
      saveGrid: jest.fn(),
      checkExistingGrids: jest.fn(),
      batchSaveGrids: jest.fn(),
    };
    service = new ContributionGridService(mockRepository);
  });

  it('should process posting contribution successfully', async () => {
    // Arrange
    mockRepository.getGrid.mockResolvedValue(createMockGrid());
    mockRepository.saveGrid.mockResolvedValue();
    
    // Act
    const result = await service.processPostingContribution('user-1', createMockPosting());
    
    // Assert
    expect(result.success).toBe(true);
    expect(mockRepository.getGrid).toHaveBeenCalledWith('user-1', ActivityType.POSTING);
    expect(mockRepository.saveGrid).toHaveBeenCalled();
  });
});
```

## Key Principles Applied

### 1. Functional Core, Imperative Shell
- **Functional Core**: Pure business logic functions with no side effects
- **Imperative Shell**: Service layer that handles I/O and orchestrates pure functions

### 2. Dependency Inversion
- Core business logic doesn't depend on external services
- Side effects are pushed to the edges (repository layer)

### 3. Single Responsibility
- Each pure function has one clear purpose
- Validation, calculation, and transformation are separated

### 4. Testability
- Pure functions are deterministic and easy to test
- No mocking required for core business logic
- Fast test execution with comprehensive coverage

## Usage Examples

### Testing Pure Functions
```typescript
import { validateContributionUpdate, ActivityType } from '../contributionGrids';

const update = {
  userId: 'test-user',
  activityType: ActivityType.POSTING,
  date: '2024-01-16',
  value: 100,
  reason: 'Test update',
  maxValue: 100,
  lastUpdated: Timestamp.now(),
  timeRange: { startDate: '2024-01-16', endDate: '2024-01-16' }
};

const validation = validateContributionUpdate(update);
console.log(validation); // { isValid: true, errors: [] }
```

### Using in Service
```typescript
// The service orchestrates pure functions and handles side effects
const service = new ContributionGridService(repository);
const result = await service.processPostingContribution(userId, postingData);
```

This architecture provides the best of both worlds: easy-to-test pure functions for business logic and a service layer that handles the complexities of I/O and error handling.