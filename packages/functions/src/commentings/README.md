# Commentings Feature

## Overview
Handles comment activity tracking when users create or update comments on posts.

## Functions

### `createCommenting`
- **Trigger**: Firestore document creation in `boards/{boardId}/posts/{postId}/comments/{commentId}`
- **Purpose**: Tracks comment creation in user's commenting history
- **Location**: `createCommenting.ts`

### `updateCommenting`  
- **Trigger**: Firestore document update in `boards/{boardId}/posts/{postId}/comments/{commentId}`
- **Purpose**: Updates comment activity records when comments are modified
- **Location**: `updateCommenting.ts`

## Types
- `Commenting`: Interface for comment activity tracking data

## Usage
```typescript
import { createCommenting, updateCommenting } from './commentings';

// Functions are automatically triggered by Firestore events
```

## Testing
Run tests from the functions directory:
```bash
npm test -- --testPathPattern=commentings
```

## Related Features
- **notifications**: Handles comment notifications
- **postings**: Related to post activity tracking
- **replyings**: Reply activity tracking