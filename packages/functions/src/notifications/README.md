# Notifications Feature

## Overview
Comprehensive notification system handling real-time notifications, push messages, and activity counters for the writing community platform.

## Functions

### Core Notification Handlers
- **`onCommentCreated`**: Sends notifications when users comment on posts
- **`onReplyCreatedOnComment`**: Notifies when users reply to comments  
- **`onReplyCreatedOnPost`**: Notifies when users reply directly to posts
- **`onReactionCreatedOnComment`**: Handles reaction notifications on comments
- **`onReactionCreatedOnReply`**: Handles reaction notifications on replies

### Counter Management
- **`incrementCommentCountOnCommentCreated`**: Updates post comment counts
- **`decrementCommentCountOnCommentDeleted`**: Updates post comment counts on deletion
- **`incrementRepliesCountOnReplyCreated`**: Updates comment reply counts
- **`decrementRepliesCountOnReplyDeleted`**: Updates comment reply counts on deletion
- **`updateCommentRepliesCounts`**: Batch updates for reply counts

### Push Notifications
- **`onNotificationCreated`**: Sends FCM push notifications to users
- **`updatePostDaysFromFirstDay`**: Updates writing streak calculations

## Utilities

### `messageGenerator.ts`
Generates notification messages with proper formatting and user mentions.

### `shouldGenerateNotification.ts`
Business logic for determining when notifications should be sent (prevents self-notifications, checks user preferences, etc.).

## Usage
```typescript
import { 
  onCommentCreated, 
  onNotificationCreated,
  generateMessage 
} from './notifications';

// Functions are automatically triggered by Firestore events
```

## Notification Flow
1. User performs action (comment, reply, reaction)
2. Appropriate handler creates notification document
3. `onNotificationCreated` triggers and sends FCM push notification
4. Counter functions update relevant counts

## Testing
Run tests from the functions directory:
```bash
npm test -- --testPathPattern=notifications
```

## Related Features
- **commentings**: Comment activity tracking
- **replyings**: Reply activity tracking  
- **postings**: Post activity tracking