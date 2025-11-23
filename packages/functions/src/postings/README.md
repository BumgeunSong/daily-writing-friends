# Postings Feature

## Overview
Handles post activity tracking and integration with the streak recovery system when users create, update, or interact with posts.

## Functions

### Activity Tracking
- **`createPosting`**: Tracks post creation in user's posting history
- **`updatePosting`**: Updates posting activity records when posts are modified

### Event Handlers  
- **`onPostingCreated`**: Processes streak recovery state transitions when posts are created

## Integration with Recovery System
The postings feature is tightly integrated with the recovery status system:
- When users create posts, it triggers `processPostingTransitions()` 
- This can change user status from 'eligible' → 'onStreak' or 'missed' → 'onStreak'
- Posts are counted toward streak recovery requirements

## Types
- `Posting`: Interface for post activity tracking data

## Usage
```typescript
import { 
  createPosting, 
  onPostingCreated,
  updatePosting 
} from './postings';

// Functions are automatically triggered by Firestore events
```

## Workflow
1. User creates a post in `boards/{boardId}/posts/{postId}`
2. `createPosting` tracks the activity in `users/{userId}/postings/{postingId}`
3. `onPostingCreated` processes potential streak recovery state transitions
4. User's recovery status may change based on posting activity

## Testing
Run tests from the functions directory:
```bash
npm test -- --testPathPattern=postings
```

## Related Features
- **recoveryStatus**: Streak recovery system integration
- **notifications**: Post-related notifications