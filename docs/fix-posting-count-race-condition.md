# Fix: Posting Count Race Condition

## Problem Description

When a user creates a post and triggers `onPostingCreated`, the function queries for posts on that date but gets 0, even though a posting was just created. This causes incorrect state transitions, particularly for users in the `eligible` recovery state.

### Example Issue
- User is in `eligible (0/2)` state (needs 2 posts to recover)
- User creates their first post of the day
- Expected: Transition to `eligible (1/2)`
- Actual: Stays at `eligible (0/2)` due to race condition

## Root Cause Analysis

The issue is caused by Firestore's eventual consistency model:

1. User creates a post in `boards/{boardId}/posts/{postId}`
2. `createPosting` function creates a document in `users/{userId}/postings/{postingId}`
3. `onPostingCreated` immediately triggers on the new posting document
4. Function queries `users/{userId}/postings` collection to count posts
5. **Problem**: The just-created document isn't visible in the query results yet

This is a classic Firestore race condition where a document trigger fires, but the document isn't immediately queryable.

## Solution: Minimal Patch

The solution adds an idempotency guard and accounts for the current post when counting.

## Implementation

### 1. Create Idempotency Guard Helper

**New file: `functions/src/shared/idempotency.ts`**

```typescript
import admin from './admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function processPostingWithIdempotency(
  userId: string,
  postingId: string,
  handler: (transaction: FirebaseFirestore.Transaction) => Promise<void>
): Promise<boolean> {
  const guardKey = `${userId}_${postingId}`;
  const guardRef = admin.firestore().doc(`eventGuards_postingCreated/${guardKey}`);
  
  return await admin.firestore().runTransaction(async (transaction) => {
    const guardDoc = await transaction.get(guardRef);
    if (guardDoc.exists) {
      console.log(`Posting ${guardKey} already processed`);
      return false;
    }
    
    // Execute the handler first
    await handler(transaction);
    
    // Write guard at the end of transaction
    const expireAt = new Date();
    expireAt.setDate(expireAt.getDate() + 30);
    
    transaction.set(guardRef, {
      processedAt: FieldValue.serverTimestamp(),
      expireAt: Timestamp.fromDate(expireAt),
      userId,
      postingId
    });
    
    return true;
  });
}
```

### 2. Update onPostingCreated Function

**File: `functions/src/postings/onPostingCreated.ts`**

```typescript
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { Posting } from "./Posting";
import { calculatePostingTransitions } from "../recoveryStatus/stateTransitions";
import { convertToSeoulTime } from "../shared/seoulTime";
import { addRecoveryHistoryToSubcollection } from "../recoveryStatus/recoveryUtils";
import { processPostingWithIdempotency } from "../shared/idempotency";
import { FieldValue } from 'firebase-admin/firestore';
import admin from '../shared/admin';

export const onPostingCreated = onDocumentCreated(
  'users/{userId}/postings/{postingId}',
  async (event) => {
    const postingData = event.data?.data() as Posting;
    if (!postingData) {
      console.error('No posting data found in event');
      return null;
    }

    const { userId, postingId } = event.params;
    
    if (!userId || !postingId) {
      console.error('Missing userId or postingId in event parameters');
      return null;
    }

    console.log(`[PostingCreated] Processing posting created for user: ${userId}, posting: ${postingId}`);

    // Process with idempotency
    const processed = await processPostingWithIdempotency(userId, postingId, async (transaction) => {
      // Get posting creation date
      let postCreatedAt: Date;
      let needsCreatedAtUpdate = false;
      
      if (postingData.createdAt) {
        postCreatedAt = postingData.createdAt.toDate();
      } else {
        console.warn(`[PostingCreated] Warning: createdAt is missing for posting ${postingId}`);
        postCreatedAt = new Date();
        needsCreatedAtUpdate = true;
      }
      
      const seoulDate = convertToSeoulTime(postCreatedAt);
      console.log(`[PostingCreated] Post created at: ${seoulDate.toISOString()} (Seoul timezone)`);
      
      // Update posting with dayKey and createdAt if needed
      const dayKey = seoulDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const postingRef = admin.firestore().doc(`users/${userId}/postings/${postingId}`);
      
      const updateData: any = { dayKey };
      if (needsCreatedAtUpdate) {
        updateData.createdAt = FieldValue.serverTimestamp();
      }
      
      transaction.set(postingRef, updateData, { merge: true });
      
      // Process state transitions with flag indicating this is from posting creation
      const dbUpdate = await calculatePostingTransitions(userId, seoulDate, true);
      
      if (dbUpdate) {
        // Update streak info within transaction
        const streakRef = admin.firestore().doc(`users/${userId}/streakInfo/current`);
        transaction.set(streakRef, dbUpdate.updates, { merge: true });
        
        console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`);
        
        // If recovery was completed, add recovery history
        if (dbUpdate.recoveryHistory) {
          const historyRef = admin.firestore()
            .collection(`users/${userId}/streakInfo/current/recoveryHistory`)
            .doc();
          transaction.set(historyRef, dbUpdate.recoveryHistory);
          console.log(`[RecoveryHistory] Recovery completed for user ${userId}`);
        }
      }
      
      console.log(`[PostingCreated] Successfully processed transitions for user: ${userId}`);
    });
    
    if (!processed) {
      console.log(`[PostingCreated] Posting ${postingId} was already processed`);
    }
    
    return null;
  }
);
```

### 3. Update Transition Orchestrator

**File: `functions/src/recoveryStatus/transitionOrchestrators.ts`**

Add the `isFromPostingCreation` parameter:

```typescript
export async function calculatePostingTransitions(
  userId: string,
  postDate: Date,
  isFromPostingCreation: boolean = false, // NEW PARAMETER
): Promise<DBUpdate | null> {
  try {
    const { data: streakInfo } = await getOrCreateStreakInfo(userId);

    if (!streakInfo) {
      return null;
    }

    switch (streakInfo.status.type) {
      case RecoveryStatusType.ELIGIBLE:
        return await calculateEligibleToOnStreak(userId, postDate, isFromPostingCreation);

      case RecoveryStatusType.MISSED:
        return await calculateMissedToOnStreak(userId, postDate, isFromPostingCreation);

      case RecoveryStatusType.ON_STREAK:
        return await calculateOnStreakToOnStreak(userId, postDate, isFromPostingCreation);

      default:
        console.warn(`[StateTransition] Unknown status type: ${streakInfo.status.type}`);
        return null;
    }
  } catch (error) {
    console.error(
      `[StateTransition] Error calculating posting transitions for user ${userId}:`,
      error,
    );
    throw error;
  }
}
```

### 4. Update Transition Wrappers

**File: `functions/src/recoveryStatus/transitionWrappers.ts`**

Update each transition function to account for the current post:

```typescript
export async function calculateEligibleToOnStreak(
  userId: string,
  postDate: Date,
  isFromPostingCreation: boolean = false, // NEW PARAMETER
): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  let todayPostCount = await countSeoulDatePosts(userId, postDate);
  
  // If called from posting creation, add 1 to account for the current post
  if (isFromPostingCreation) {
    todayPostCount += 1;
  }
  
  return calculateEligibleToOnStreakPure(userId, postDate, streakInfo, todayPostCount);
}

export async function calculateMissedToOnStreak(
  userId: string,
  postDate: Date,
  isFromPostingCreation: boolean = false, // NEW PARAMETER
): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);
  let todayPostCount = await countSeoulDatePosts(userId, postDate);
  
  if (isFromPostingCreation) {
    todayPostCount += 1;
  }
  
  return calculateMissedToOnStreakPure(userId, postDate, streakInfo, todayPostCount);
}

export async function calculateOnStreakToOnStreak(
  userId: string,
  postDate: Date,
  isFromPostingCreation: boolean = false, // NEW PARAMETER
): Promise<DBUpdate | null> {
  const { data: streakInfo } = await getOrCreateStreakInfo(userId);

  if (!streakInfo || streakInfo.status.type !== RecoveryStatusType.ON_STREAK) {
    return null;
  }

  const baseUpdate = createBaseUpdate(userId, 'onStreak → onStreak (streak maintained)');

  return {
    ...baseUpdate,
    updates: {
      ...baseUpdate.updates,
      lastContributionDate: postDate.toISOString().split('T')[0],
      status: {
        type: RecoveryStatusType.ON_STREAK,
      },
      currentStreak: streakInfo.currentStreak + 1,
      originalStreak: streakInfo.originalStreak + 1,
    },
  };
}
```

### 5. Configure Firestore TTL

**File: `firestore.indexes.json`**

Add TTL configuration for event guards:

```json
{
  "fieldOverrides": [
    {
      "collectionGroup": "eventGuards_postingCreated",
      "fieldPath": "expireAt",
      "ttl": true
    }
  ]
}
```

## Testing

### 1. Test Idempotency
```bash
# Create a post twice with the same ID (simulate duplicate event)
# Should only process once
```

### 2. Test State Transitions
```bash
# Test user in eligible (0/2) creating first post
# Should transition to eligible (1/2)

# Test user in eligible (1/2) creating second post
# Should transition to onStreak
```

### 3. Test Missing createdAt
```bash
# Create posting without createdAt
# Should use serverTimestamp()
```

## Deployment

1. **Deploy Functions**
```bash
cd functions
npm run build
firebase deploy --only functions:onPostingCreated,functions:createPosting
```

2. **Deploy Firestore Indexes**
```bash
firebase deploy --only firestore:indexes
```

3. **Monitor Logs**
```bash
firebase functions:log --only onPostingCreated
```

## Benefits

- ✅ **Idempotent**: Prevents double processing
- ✅ **Race-condition free**: Accounts for current post
- ✅ **Atomic**: All updates in single transaction
- ✅ **TTL cleanup**: Event guards auto-expire after 30 days
- ✅ **Backward compatible**: Works with existing data

## Future Improvements

For a more robust long-term solution, consider:
1. Moving to fully event-driven architecture without queries
2. Using daily counter documents with `FieldValue.increment()`
3. Maintaining active user lists for efficient batch processing