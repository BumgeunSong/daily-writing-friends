# Replyings Feature

## Overview
Handles reply and reaction activity tracking when users create or update replies and reactions on comments and posts.

## Functions

### `createReplying`
- **Trigger**: Firestore document creation for replies
- **Purpose**: Tracks reply creation in user's replying history
- **Location**: `createReplying.ts`

### `updateReplying`
- **Trigger**: Firestore document update for replies
- **Purpose**: Updates reply activity records when replies are modified
- **Location**: `updateReplying.ts`

## Types
- `Replying`: Interface for reply activity tracking data
- `Reaction`: Interface for reaction data (likes, hearts, etc.) - Located in `shared/types/Reaction`

## Usage
```typescript
import { createReplying, updateReplying } from './replyings';

// Functions are automatically triggered by Firestore events
```

## Data Flow
1. User creates a reply to a comment or post
2. `createReplying` tracks the activity in user's replying subcollection
3. Reply counts are updated via notification system
4. Activity is logged for user engagement analytics

## Testing
Run tests from the functions directory:
```bash
npm test -- --testPathPattern=replyings
```

## Related Features
- **notifications**: Reply notifications and counter updates
- **commentings**: Comment activity tracking
- **postings**: Post activity tracking