# Correct Existing Miscalculated States

## Problem Description

Due to the race condition bug in `onPostingCreated`, some users have incorrect state data:
- Users showing `eligible (0/2)` when they actually have 1 or 2 posts
- Users who should have recovered but are still in `eligible` state
- Users with incorrect post counts in their recovery status

## Solution Overview

We need two scripts:
1. **Migration script** to add `dayKey` to existing postings for efficient querying
2. **Correction script** to recalculate and fix incorrect states

## Implementation

### 1. Add dayKey to Existing Postings

**New file: `functions/src/scripts/addDayKeyToPostings.ts`**

```typescript
import admin from '../shared/admin';
import { formatSeoulDate } from '../shared/calendar';
import { convertToSeoulTime } from '../shared/seoulTime';

export async function addDayKeyToPostings(
  dryRun: boolean = true,
  batchSize: number = 500
): Promise<{ processed: number; updated: number }> {
  let lastDoc = null;
  let processedCount = 0;
  let updatedCount = 0;
  
  console.log(`Starting dayKey migration (dryRun: ${dryRun}, batchSize: ${batchSize})`);
  
  while (true) {
    // Get batch of postings
    let query = admin.firestore()
      .collectionGroup('postings')
      .orderBy('createdAt')
      .limit(batchSize);
    
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      console.log(`Finished processing ${processedCount} postings, updated ${updatedCount}`);
      break;
    }
    
    const batch = admin.firestore().batch();
    let batchUpdates = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      processedCount++;
      
      // Skip if dayKey already exists
      if (data.dayKey) {
        return;
      }
      
      if (data.createdAt) {
        const date = convertToSeoulTime(data.createdAt.toDate());
        const dayKey = formatSeoulDate(date);
        
        if (!dryRun) {
          batch.update(doc.ref, { dayKey });
        }
        
        batchUpdates++;
        updatedCount++;
      }
    });
    
    if (!dryRun && batchUpdates > 0) {
      await batch.commit();
      console.log(`Updated batch: ${batchUpdates} postings (total: ${updatedCount})`);
    } else if (dryRun && batchUpdates > 0) {
      console.log(`Would update batch: ${batchUpdates} postings (total: ${updatedCount})`);
    }
    
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }
  
  return { processed: processedCount, updated: updatedCount };
}

// HTTP endpoint
export async function addDayKeyToPostingsHttp(req: any, res: any) {
  const { dryRun = 'true', batchSize = '500' } = req.query;
  
  try {
    const result = await addDayKeyToPostings(
      dryRun !== 'false',
      parseInt(batchSize, 10)
    );
    
    res.status(200).json({
      success: true,
      dryRun: dryRun !== 'false',
      ...result
    });
  } catch (error) {
    console.error('Error in addDayKeyToPostings:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
```

### 2. Fix Miscalculated States

**New file: `functions/src/scripts/fixMiscalculatedStates.ts`**

```typescript
import admin from '../shared/admin';
import { StreakInfo, RecoveryStatusType } from '../recoveryStatus/StreakInfo';
import { formatSeoulDate, convertToSeoulTime } from '../shared/calendar';
import { Timestamp } from 'firebase-admin/firestore';

interface CorrectionResult {
  userId: string;
  before: any;
  after: any;
  corrected: boolean;
  reason: string;
}

export async function fixMiscalculatedStates(
  dryRun: boolean = true,
  specificUserId?: string
): Promise<CorrectionResult[]> {
  const results: CorrectionResult[] = [];
  
  console.log(`Starting state correction (dryRun: ${dryRun}, userId: ${specificUserId || 'all'})`);
  
  // Get users to check
  let userIds: string[] = [];
  
  if (specificUserId) {
    userIds = [specificUserId];
  } else {
    // Get all users with streak info
    const streakSnapshot = await admin.firestore()
      .collectionGroup('streakInfo')
      .where('status.type', '==', RecoveryStatusType.ELIGIBLE)
      .get();
    
    userIds = streakSnapshot.docs.map(doc => {
      // Extract userId from path: users/{userId}/streakInfo/current
      const pathParts = doc.ref.path.split('/');
      return pathParts[1]; // userId is at index 1
    });
    
    console.log(`Found ${userIds.length} users in ELIGIBLE state to check`);
  }
  
  for (const userId of userIds) {
    try {
      const correction = await checkAndCorrectUser(userId, dryRun);
      if (correction) {
        results.push(correction);
      }
    } catch (error) {
      console.error(`Error processing user ${userId}:`, error);
      results.push({
        userId,
        before: null,
        after: null,
        corrected: false,
        reason: `Error: ${error.message}`
      });
    }
  }
  
  return results;
}

async function checkAndCorrectUser(
  userId: string,
  dryRun: boolean
): Promise<CorrectionResult | null> {
  // Get current streak info
  const streakRef = admin.firestore().doc(`users/${userId}/streakInfo/current`);
  const streakDoc = await streakRef.get();
  
  if (!streakDoc.exists) {
    console.log(`No streak info for user ${userId}`);
    return null;
  }
  
  const streakInfo = streakDoc.data() as StreakInfo;
  const status = streakInfo.status;
  
  // Only process ELIGIBLE users
  if (status.type !== RecoveryStatusType.ELIGIBLE) {
    return null;
  }
  
  if (!status.deadline || !status.missedDate) {
    console.warn(`User ${userId} has incomplete eligible status`);
    return null;
  }
  
  // Calculate the recovery day (day after missed date)
  const missedDate = status.missedDate.toDate();
  const recoveryDate = new Date(missedDate);
  recoveryDate.setDate(recoveryDate.getDate() + 1);
  const recoveryDayKey = formatSeoulDate(convertToSeoulTime(recoveryDate));
  
  console.log(`Checking user ${userId} for recovery on ${recoveryDayKey}`);
  
  // Count actual posts on recovery day
  let actualPostCount = 0;
  
  // First try with dayKey (if migration was done)
  const dayKeySnapshot = await admin.firestore()
    .collection(`users/${userId}/postings`)
    .where('dayKey', '==', recoveryDayKey)
    .get();
  
  if (dayKeySnapshot.size > 0) {
    actualPostCount = dayKeySnapshot.size;
    console.log(`Found ${actualPostCount} posts using dayKey query`);
  } else {
    // Fallback to date range query
    const startOfDay = new Date(`${recoveryDayKey}T00:00:00+09:00`); // Seoul time
    const endOfDay = new Date(`${recoveryDayKey}T23:59:59.999+09:00`); // Seoul time
    
    // Convert to UTC for Firestore query
    const startTimestamp = Timestamp.fromDate(new Date(startOfDay.getTime() - 9 * 60 * 60 * 1000));
    const endTimestamp = Timestamp.fromDate(new Date(endOfDay.getTime() - 9 * 60 * 60 * 1000));
    
    const rangeSnapshot = await admin.firestore()
      .collection(`users/${userId}/postings`)
      .where('createdAt', '>=', startTimestamp)
      .where('createdAt', '<=', endTimestamp)
      .get();
    
    actualPostCount = rangeSnapshot.size;
    console.log(`Found ${actualPostCount} posts using date range query`);
  }
  
  const currentPostsInStatus = status.currentPosts || 0;
  const postsRequired = status.postsRequired || 2;
  
  // Check if correction is needed
  if (actualPostCount === currentPostsInStatus) {
    console.log(`User ${userId}: No correction needed (${actualPostCount}/${postsRequired})`);
    return null;
  }
  
  console.log(`User ${userId}: Correction needed - actual: ${actualPostCount}, recorded: ${currentPostsInStatus}`);
  
  // Determine the correct state
  let newStatus: any;
  let correctionReason: string;
  
  const now = new Date();
  const deadlineDate = status.deadline.toDate();
  
  if (actualPostCount >= postsRequired) {
    // Should have recovered!
    const originalStreak = streakInfo.originalStreak || 0;
    
    // Check if Friday miss (for streak calculation)
    const missedDayOfWeek = missedDate.getDay();
    const isFridayMiss = missedDayOfWeek === 5;
    
    const streakIncrement = isFridayMiss ? 1 : 2;
    const newStreak = originalStreak + streakIncrement;
    
    newStatus = {
      status: { type: RecoveryStatusType.ON_STREAK },
      currentStreak: newStreak,
      originalStreak: newStreak,
      longestStreak: Math.max(streakInfo.longestStreak || 0, newStreak),
      lastContributionDate: recoveryDayKey,
      lastCalculated: Timestamp.now()
    };
    
    correctionReason = `Should have recovered: had ${actualPostCount}/${postsRequired} posts`;
    
    // Create recovery history
    if (!dryRun) {
      await admin.firestore()
        .collection(`users/${userId}/streakInfo/current/recoveryHistory`)
        .add({
          missedDate: status.missedDate,
          recoveryDate: Timestamp.fromDate(recoveryDate),
          postsRequired,
          postsWritten: actualPostCount,
          recoveredAt: Timestamp.now()
        });
      console.log(`Added recovery history for user ${userId}`);
    }
  } else if (now > deadlineDate) {
    // Deadline passed - should be in missed state
    newStatus = {
      status: { type: RecoveryStatusType.MISSED },
      currentStreak: actualPostCount, // Preserve partial progress per PRD
      originalStreak: 0,
      lastCalculated: Timestamp.now()
    };
    
    correctionReason = `Deadline passed with only ${actualPostCount}/${postsRequired} posts`;
  } else {
    // Still eligible but with correct count
    newStatus = {
      'status.currentPosts': actualPostCount,
      lastCalculated: Timestamp.now()
    };
    
    correctionReason = `Corrected post count: ${currentPostsInStatus} → ${actualPostCount}`;
  }
  
  // Apply the correction
  if (!dryRun) {
    await streakRef.update(newStatus);
    console.log(`Updated user ${userId}: ${correctionReason}`);
  }
  
  return {
    userId,
    before: {
      status: streakInfo.status,
      currentStreak: streakInfo.currentStreak,
      originalStreak: streakInfo.originalStreak
    },
    after: newStatus,
    corrected: true,
    reason: correctionReason
  };
}

// HTTP endpoint
export async function fixMiscalculatedStatesHttp(req: any, res: any) {
  const { dryRun = 'true', userId } = req.query;
  
  try {
    const results = await fixMiscalculatedStates(
      dryRun !== 'false',
      userId
    );
    
    const summary = {
      success: true,
      total: results.length,
      corrected: results.filter(r => r.corrected).length,
      errors: results.filter(r => !r.corrected && r.reason.startsWith('Error')).length,
      dryRun: dryRun !== 'false',
      results
    };
    
    res.status(200).json(summary);
  } catch (error) {
    console.error('Error in fixMiscalculatedStates:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
```

### 3. Add HTTP Endpoints

**File: `functions/src/index.ts`**

Add these exports:

```typescript
// Correction scripts
export { 
  addDayKeyToPostingsHttp,
  fixMiscalculatedStatesHttp 
} from './scripts';
```

## Usage Instructions

### Step 1: Deploy the Fix (from previous document)
First deploy the race condition fix to prevent new issues.

### Step 2: Add dayKey to Existing Postings

```bash
# Dry run to see what will be updated
curl "https://[YOUR-PROJECT].cloudfunctions.net/addDayKeyToPostingsHttp?dryRun=true"

# Example response:
{
  "success": true,
  "dryRun": true,
  "processed": 1500,
  "updated": 1200
}

# Execute the migration
curl "https://[YOUR-PROJECT].cloudfunctions.net/addDayKeyToPostingsHttp?dryRun=false"

# With custom batch size
curl "https://[YOUR-PROJECT].cloudfunctions.net/addDayKeyToPostingsHttp?dryRun=false&batchSize=1000"
```

### Step 3: Fix Miscalculated States

#### Check Specific User

```bash
# Dry run for specific user
curl "https://[YOUR-PROJECT].cloudfunctions.net/fixMiscalculatedStatesHttp?userId=USER_ID&dryRun=true"

# Example response:
{
  "success": true,
  "total": 1,
  "corrected": 1,
  "errors": 0,
  "dryRun": true,
  "results": [
    {
      "userId": "USER_ID",
      "before": {
        "status": {
          "type": "eligible",
          "currentPosts": 0,
          "postsRequired": 2
        },
        "currentStreak": 5,
        "originalStreak": 5
      },
      "after": {
        "status.currentPosts": 1,
        "lastCalculated": {...}
      },
      "corrected": true,
      "reason": "Corrected post count: 0 → 1"
    }
  ]
}

# Apply the fix
curl "https://[YOUR-PROJECT].cloudfunctions.net/fixMiscalculatedStatesHttp?userId=USER_ID&dryRun=false"
```

#### Check All Users

```bash
# Dry run for all eligible users
curl "https://[YOUR-PROJECT].cloudfunctions.net/fixMiscalculatedStatesHttp?dryRun=true"

# Apply fixes to all users (BE CAREFUL!)
curl "https://[YOUR-PROJECT].cloudfunctions.net/fixMiscalculatedStatesHttp?dryRun=false"
```

## What Gets Corrected

### 1. Wrong Post Counts
- Users showing `eligible (0/2)` who actually have 1 post → `eligible (1/2)`
- Users showing `eligible (1/2)` who actually have 0 posts → `eligible (0/2)`

### 2. Missed Recoveries
- Users showing `eligible (1/2)` who actually have 2+ posts → `onStreak`
- Creates recovery history record for audit trail
- Calculates correct new streak value

### 3. Expired Deadlines
- Users in `eligible` state whose deadline has passed → `missed`
- Preserves partial progress in currentStreak per PRD

## Safety Features

1. **Dry Run by Default**: Always runs in dry run mode unless explicitly set to false
2. **Detailed Logging**: Every action is logged with before/after states
3. **Error Handling**: Continues processing even if individual users fail
4. **Idempotent**: Can be run multiple times safely
5. **Audit Trail**: Returns detailed results for review

## Monitoring

### Check Logs

```bash
# View function logs
firebase functions:log --only fixMiscalculatedStatesHttp

# Filter for specific user
firebase functions:log --only fixMiscalculatedStatesHttp | grep "USER_ID"
```

### Verify Corrections

After running corrections, verify in Firestore Console:
1. Check `users/{userId}/streakInfo/current` for updated status
2. Check `users/{userId}/streakInfo/current/recoveryHistory` for recovery records
3. Check `users/{userId}/postings` for dayKey fields

## Rollback Plan

If corrections cause issues:

1. **Restore from Firestore Backup** (if available)
2. **Manual Correction Script** to revert specific users
3. **Contact affected users** with explanation

## Prevention

Once both fixes are deployed:
1. New posts won't have race conditions
2. All postings will have dayKey for efficient queries
3. State transitions will be deterministic
4. Regular monitoring can catch any edge cases