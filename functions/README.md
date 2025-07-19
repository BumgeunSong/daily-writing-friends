# Firebase Cloud Functions - Daily Writing Friends

## Overview
This directory contains Firebase Cloud Functions for the Daily Writing Friends platform, organized in a feature-based architecture for better maintainability and scalability.

## Architecture

### Directory Structure
```
src/
├── shared/                   # Shared utilities and global types
│   ├── admin.ts             # Firebase Admin SDK setup
│   ├── dateUtils.ts         # Date utility functions  
│   ├── types/               # Global type definitions
│   └── index.ts             # Shared exports
├── commentings/             # Comment activity tracking
├── notifications/           # Notification system
├── postings/               # Post activity tracking
├── recoveryStatus/         # Streak recovery system
├── replyings/              # Reply activity tracking
├── writingHistory/         # Daily writing analytics
├── scripts/                # One-time administrative scripts
└── test/                   # Global test utilities
```

### Feature-Based Organization
Each feature folder follows this pattern:
- **Handlers**: Cloud Function implementations
- **Types**: Feature-specific type definitions
- **Tests**: Unit and integration tests (in `__tests__/`)
- **Documentation**: Feature-specific README.md
- **Index**: Re-exports for clean imports

## Features Overview

### 📝 [Commentings](./src/commentings/README.md)
Tracks user comment activity and maintains comment history.
- `createCommenting`: Records comment creation events
- `updateCommenting`: Handles comment modifications

### 🔔 [Notifications](./src/notifications/README.md)
Comprehensive notification system with real-time push notifications.
- Comment/reply notifications
- FCM push message delivery
- Activity counter management
- Message generation utilities

### 📄 [Postings](./src/postings/README.md)  
Post activity tracking with streak recovery integration.
- `createPosting`: Records post creation
- `onPostingCreated`: Triggers streak recovery logic
- Integration with recovery status system

### 🔄 [Recovery Status](./src/recoveryStatus/README.md)
3-state streak recovery system with comprehensive testing.
- State transitions: onStreak ↔ eligible ↔ missed
- Deadline calculations and weekend handling
- 102 unit tests with full coverage

### 💬 [Replyings](./src/replyings/README.md)
Reply and reaction activity tracking.
- `createReplying`: Records reply creation
- `updateReplying`: Handles reply modifications
- Reaction data management

### 📊 [Writing History](./src/writingHistory/README.md)
Daily writing analytics and achievement system.
- Daily writing statistics
- Badge and achievement generation
- Contribution tracking analytics

### ⚙️ [Scripts](./src/scripts/README.md)
Administrative functions and one-time scripts.
- `allocateSecretBuddy`: Community event management

### 🛠️ [Shared](./src/shared/)
Common utilities and global types.
- Firebase Admin SDK configuration
- Date/timezone utilities
- Global type definitions (User, Post, Comment, etc.)

## Development

### Setup
```bash
cd functions
npm install
```

### Build
```bash
npm run build
```

### Testing  
```bash
# Run all tests
npm test

# Run specific feature tests
npm test -- --testPathPattern=recoveryStatus
npm test -- --testPathPattern=notifications
```

### Local Development
```bash
# Start Firebase emulator
firebase emulators:start --only functions

# Watch mode for development
npm run build:watch
```

### Deployment
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:onPostingCreated
```

## Testing Strategy

### Comprehensive Coverage
- **59 passing tests** across all features
- **Mocked dependencies** for predictable testing
- **Feature-specific test suites** in each `__tests__/` folder
- **Integration tests** for cross-feature functionality

### Test Commands
```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Specific test files
npm test -- stateTransitions.test.ts
npm test -- notifications.test.ts
```

## Import Patterns

### Feature Imports
```typescript
// Import entire feature
import * as notifications from './notifications';
import * as postings from './postings';

// Import specific functions
import { onPostingCreated } from './postings';
import { onCommentCreated } from './notifications';
```

### Shared Utilities
```typescript
import { admin, toSeoulDate } from './shared';
import type { User, Post } from './shared';
```

## Function Registration
All functions are registered in `src/index.ts` using the feature-based imports:

```typescript
export {
  // Notifications
  onCommentCreated,
  onNotificationCreated,
  
  // Postings  
  onPostingCreated,
  createPosting,
  
  // Recovery Status
  updateRecoveryStatusOnMidnightV2,
  
  // Other features...
} from './feature-folders';
```

## Best Practices

### Error Handling
- Always include try-catch blocks
- Log errors with context
- Return null for failed operations
- Don't throw errors in Cloud Functions

### Performance  
- Use batch operations for multiple writes
- Minimize cold starts with proper imports
- Cache expensive operations
- Use appropriate timeout values

### Security
- Validate all input data
- Check user permissions
- Sanitize user content
- Use Firestore security rules

### TypeScript
- Strict type checking enabled
- Interface definitions for all data
- Runtime validation with proper typing
- No any types in production code

## Monitoring & Debugging

### Logs
```bash
# View function logs
firebase functions:log

# Real-time logs
firebase functions:log --follow
```

### Performance
- Monitor execution times in Firebase Console
- Track memory usage and cold starts
- Use Cloud Monitoring for alerts

## Related Documentation
- [Main Project README](../README.md)
- [Frontend Architecture](../CLAUDE.md)
- [Authentication & Routing](../AUTHENTICATION_ROUTING.md)