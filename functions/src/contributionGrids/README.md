# Contribution Grid Feature Architecture

This document describes the restructured contribution grid feature following clean architecture principles.

## Directory Structure

```
contributionGrids/
├── controllers/          # Cloud Function controllers (routing layer)
│   ├── contributionGridController.ts    # Real-time grid update functions
│   └── backfillController.ts           # HTTP function for backfill operations
├── services/             # Business logic orchestration
│   ├── contributionGridService.ts      # Core grid management service
│   └── backfillService.ts             # Backfill operations service
├── repository/           # Data access layer
│   ├── contributionGridRepository.ts   # Grid data operations
│   └── userActivityRepository.ts      # User activity data operations
├── domain/              # Pure business logic and models
│   ├── models.ts                      # Domain models and interfaces
│   ├── validators.ts                  # Domain validation logic
│   ├── gridCalculator.ts             # Pure calculation functions
│   └── gridBuilder.ts                # Grid building logic
├── utils/               # Utility exports (backward compatibility)
│   └── index.ts                      # Re-exports from domain layer
├── __tests__/           # Test files
└── index.ts             # Main feature entry point
```

## Architecture Layers

### 1. Domain Layer (`./domain/`)
**Pure business logic, no side effects**

- **models.ts**: Core data structures and types
- **validators.ts**: Domain validation rules
- **gridCalculator.ts**: Pure calculation functions for grids
- **gridBuilder.ts**: Logic for building grids from activities

### 2. Repository Layer (`./repository/`)
**Data access abstraction**

- **ContributionGridRepository**: Handles all Firestore operations for contribution grids
- **UserActivityRepository**: Handles user posting/commenting data access

### 3. Service Layer (`./services/`)
**Business logic orchestration**

- **ContributionGridService**: Orchestrates grid updates using domain logic and repositories
- **BackfillService**: Handles bulk operations for historical data processing

### 4. Controller Layer (`./controllers/`)
**Cloud Function entry points**

- **contributionGridController.ts**: Real-time Firestore triggers
- **backfillController.ts**: HTTP functions for administrative operations

## Key Principles Applied

### Single Responsibility Principle
Each file/class has a single, well-defined purpose:
- Controllers: Handle HTTP/trigger routing
- Services: Orchestrate business operations  
- Repositories: Manage data access
- Domain: Pure business logic

### Dependency Inversion
- High-level modules don't depend on low-level modules
- Controllers depend on Services
- Services depend on Repositories
- Domain layer has no dependencies

### Separation of Concerns
- Pure functions in domain layer (testable, predictable)
- Side effects isolated to repository layer
- Business logic orchestration in service layer
- External interfaces handled by controllers

## Migration from Old Structure

The old files have been deprecated but maintain backward compatibility:

- `types.ts` → `domain/models.ts` + `domain/validators.ts`
- `gridUtils.ts` → `domain/gridCalculator.ts`
- `gridBuilder.ts` → `domain/gridBuilder.ts`
- `calculateContributionGrid.ts` → `domain/gridCalculator.ts` + `services/contributionGridService.ts`
- `updateContributionGrid.ts` → `controllers/contributionGridController.ts`
- `backfillScript.ts` → `controllers/backfillController.ts`
- `backfillUtils.ts` → `services/backfillService.ts`

## Usage Examples

### Using the New Architecture

```typescript
// Import from main feature entry point
import { 
  updatePostingContributionGrid,
  updateCommentingContributionGrid,
  backfillContributionGrids,
  ContributionGridService,
  ActivityType 
} from '../contributionGrids';

// Or import specific layers
import { ContributionGridRepository } from '../contributionGrids/repository/contributionGridRepository';
import { calculatePostingValue } from '../contributionGrids/domain/gridCalculator';
```

### Backward Compatibility

```typescript
// Old imports still work
import { ActivityType, ContributionDay } from '../contributionGrids/types';
import { formatDate } from '../contributionGrids/gridUtils';
```

## Testing Strategy

The new architecture enables better testing:

1. **Domain Layer**: Pure functions, easy to unit test
2. **Service Layer**: Business logic testing with mocked repositories
3. **Repository Layer**: Data access testing with Firebase emulator
4. **Controller Layer**: Integration testing with Cloud Functions emulator

## Benefits of This Architecture

1. **Maintainability**: Clear separation of concerns makes code easier to understand and modify
2. **Testability**: Pure functions and dependency injection enable comprehensive testing
3. **Scalability**: Modular structure allows features to grow without becoming tangled
4. **Reusability**: Domain logic can be reused across different contexts
5. **Reliability**: Isolated side effects and clear data flow reduce bugs

## Future Enhancements

This architecture supports future improvements:

- Easy addition of new activity types
- Better error handling and logging
- Performance optimizations in specific layers
- API versioning through controller layer
- Advanced caching strategies in repository layer