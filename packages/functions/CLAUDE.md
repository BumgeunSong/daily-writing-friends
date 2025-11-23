# Functions Package - CLAUDE.md

This file provides Firebase Cloud Functions-specific guidance for the backend serverless functions.

## Architecture Overview

### Directory Structure

```
functions/
├── src/
│   ├── admin.ts                    # Firebase Admin SDK setup
│   ├── index.ts                    # Function exports
│   ├── dateUtils.ts                # Date utilities
│   ├── notifications/              # Notification system functions
│   │   ├── commentOnPost.ts        # Comment notifications
│   │   ├── replyOnComment.ts       # Reply notifications
│   │   ├── replyOnPost.ts          # Post reply notifications
│   │   ├── sendMessageOnNotification.ts # FCM message sending
│   │   ├── messageGenerator.ts     # Notification message templates
│   │   ├── shouldGenerateNotification.ts # Notification rules
│   │   ├── incrementCommentCount.ts # Comment count updates
│   │   ├── incrementRepliesCount.ts # Reply count updates
│   │   └── updateDaysFromFirstDay.ts # Writing streak calculations
│   ├── postings/                   # Post activity tracking
│   │   ├── createPosting.ts        # Track post creation
│   │   └── updatePosting.ts        # Track post updates
│   ├── commentings/                # Comment activity tracking
│   │   ├── createCommenting.ts     # Track comment creation
│   │   └── updateCommenting.ts     # Track comment updates
│   ├── replyings/                  # Reply activity tracking
│   │   ├── createReplying.ts       # Track reply creation
│   │   └── updateReplying.ts       # Track reply updates
│   ├── shared/                     # Shared utilities and types
│   │   ├── types/                  # TypeScript interfaces
│   │   │   ├── Post.ts, Comment.ts, Reply.ts
│   │   │   ├── User.ts, Board.ts
│   │   │   ├── Notification.ts
│   │   │   ├── Posting.ts, Commenting.ts, Replying.ts
│   │   │   ├── WritingHistory.ts
│   │   │   └── FirebaseMessagingToken.ts
│   │   ├── admin.ts                # Admin SDK instance
│   │   └── calendar.ts             # Calendar utilities
│   ├── backfill/                   # Data backfill scripts
│   └── oneTimeScript/              # Administrative functions
│       └── allocateSecretBuddy.ts
├── package.json                    # Dependencies and scripts
└── tsconfig.json                   # TypeScript configuration
```

## Function Patterns

### Function Structure Pattern

```typescript
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import admin from '../shared/admin';
import { Post } from '../shared/types/Post';

export const createPosting = onDocumentCreated('boards/{boardId}/posts/{postId}', async (event) => {
  const postData = event.data?.data() as Post;
  const { boardId, postId } = event.params;

  // Always validate data exists
  if (!postData) {
    console.error('No post data found.');
    return null;
  }

  // Extract required fields
  const { authorId, title, content, createdAt } = postData;

  // Perform operations with error handling
  try {
    await admin
      .firestore()
      .collection('users')
      .doc(authorId)
      .collection('postings')
      .add(postingData);

    console.log(`Created posting activity for user ${authorId}`);
  } catch (error) {
    console.error('Error writing posting activity:', error);
  }

  return null;
});
```

### Key Function Categories

#### 1. Activity Tracking Functions

- **createPosting**: Tracks post creation in user's posting history
- **createCommenting**: Tracks comment creation in user's commenting history
- **createReplying**: Tracks reply creation in user's replying history
- **updatePosting/updateCommenting/updateReplying**: Handle activity updates

#### 2. Notification Functions

```typescript
// Notification creation pattern
import { shouldGenerateNotification } from './shouldGenerateNotification';
import { generateMessage } from './messageGenerator';

export const onCommentCreated = onDocumentCreated(
  'boards/{boardId}/posts/{postId}/comments/{commentId}',
  async (event) => {
    const comment = event.data?.data() as Comment;
    const { boardId, postId, commentId } = event.params;

    // Get post data to find post author
    const postSnapshot = await admin.firestore().doc(`boards/${boardId}/posts/${postId}`).get();
    const postData = postSnapshot.data() as Post;

    // Generate notification message
    const message = generateMessage(
      NotificationType.COMMENT_ON_POST,
      comment.userName,
      postData.title,
    );

    // Check if notification should be sent
    if (
      shouldGenerateNotification(
        NotificationType.COMMENT_ON_POST,
        postData.authorId,
        comment.userId,
      )
    ) {
      // Create notification in user's subcollection
      await admin
        .firestore()
        .collection(`users/${postData.authorId}/notifications`)
        .add(notification);
    }
  },
);
```

#### 3. Count Update Functions

- **incrementCommentCount/decrementCommentCount**: Update post comment counts
- **incrementRepliesCount/decrementRepliesCount**: Update comment reply counts
- **updateCommentRepliesCounts**: Batch update reply counts

#### 4. Writing History Functions

- **createWritingHistoryOnPostCreated**: Track daily writing activity
- **deleteWritingHistoryOnPostDeleted**: Remove writing history when post deleted
- **getWritingStats**: HTTP function returning user writing statistics
- **createBadges**: Generate achievement badges based on writing activity
- **updateWritingHistoryByBatch**: Batch update writing histories

#### 5. Real-time Update Functions

- **updateDaysFromFirstDay**: Calculate writing streak days
- **sendMessageOnNotification**: Send FCM push notifications

## TypeScript Configuration

### TypeScript Version

This package uses TypeScript 5.6.3 for better type safety and modern features.

### Important Type Imports

Always use `firebase-admin` imports for backend code, NOT `firebase` client SDK:

```typescript
// ✅ CORRECT - Backend/Functions
import { Timestamp } from 'firebase-admin/firestore';
import admin from 'firebase-admin';

// ❌ WRONG - Don't use client SDK in functions
import { Timestamp } from 'firebase/firestore';
```

### Type Safety Patterns

All functions use strongly typed interfaces from `src/shared/types/`:

```typescript
// Example from src/shared/types/Post.ts
import { Timestamp } from 'firebase-admin/firestore';

export interface Post {
  id: string;
  boardId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt?: Timestamp;
  countOfComments: number;
  countOfReplies: number;
  weekDaysFromFirstDay?: number;
}
```

## Admin SDK Setup

```typescript
// src/shared/admin.ts
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

export default admin;
```

## Error Handling Pattern

Always include proper error handling and logging:

```typescript
try {
  await admin.firestore().collection('...').add(data);
  console.log(`Successfully created ${resourceType}`);
} catch (error) {
  console.error(`Error creating ${resourceType}:`, error);
  // Don't throw - let function complete gracefully
}
```

## Testing Patterns

### Firebase Functions Testing

```typescript
describe('Cloud Function Behavior', () => {
  describe('when document is created', () => {
    it('processes the document correctly', async () => {
      // Arrange
      const mockEvent = {
        data: { data: () => ({ title: 'Test Post' }) },
        params: { userId: 'user123' },
      };

      // Act
      const result = await cloudFunction(mockEvent);

      // Assert - Test the business outcome
      expect(result).toEqual(expectedResult);
    });
  });
});
```

### Mock Firebase Admin

```typescript
// Mock Firebase Admin SDK
jest.mock('../shared/admin', () => ({
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
      })),
      add: jest.fn(),
    })),
  })),
}));
```

## Development Commands

```bash
# Build functions
pnpm build

# Run emulator
pnpm serve

# Deploy functions
pnpm deploy

# Run tests
pnpm test

# Type checking
pnpm type-check

# Lint
pnpm lint
```

## Function Deployment

Functions are deployed via Firebase CLI:

```bash
# Deploy all functions
pnpm --filter functions deploy

# Deploy specific function
firebase deploy --only functions:functionName
```

The `firebase.json` at monorepo root is configured to:
1. Run lint before deployment
2. Build the TypeScript code
3. Deploy from `packages/functions/` directory

## Environment Variables

Functions can access environment variables via:

```typescript
import { defineString } from 'firebase-functions/params';

const apiKey = defineString('API_KEY');

export const myFunction = onRequest((req, res) => {
  const key = apiKey.value();
  // Use key...
});
```

Set environment variables with:

```bash
firebase functions:config:set api.key="your-key"
```

## Common Patterns

### Batch Operations

```typescript
const batch = admin.firestore().batch();

// Add multiple operations
batch.set(docRef1, data1);
batch.update(docRef2, data2);
batch.delete(docRef3);

// Commit all at once
await batch.commit();
```

### Transaction Operations

```typescript
await admin.firestore().runTransaction(async (transaction) => {
  const doc = await transaction.get(docRef);
  const newValue = doc.data().count + 1;

  transaction.update(docRef, { count: newValue });
});
```

### Subcollection Queries

```typescript
const snapshot = await admin
  .firestore()
  .collection('users')
  .doc(userId)
  .collection('notifications')
  .where('read', '==', false)
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();

const notifications = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```
