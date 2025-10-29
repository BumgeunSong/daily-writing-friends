# Phase 3 Implementation Plan: Historical Event Backfill

**Version:** phase3-backfill-v1
**Status:** Planning
**Last Updated:** 2025-10-29

## Table of Contents

- [Overview](#overview)
- [Current State Analysis](#current-state-analysis)
- [Step 1: Remove Phase 1 Code](#step-1-remove-phase-1-code)
- [Step 2: Backfill Historical Events](#step-2-backfill-historical-events)
- [Testing Strategy](#testing-strategy)
- [Rollback Strategy](#rollback-strategy)
- [Success Metrics](#success-metrics)

---

## Overview

Phase 3 Backfill completes the event sourcing migration by:

1. **Removing Phase 1 code** - Clean deletion of legacy state-based streak system
2. **Backfilling events** - Generate complete event history from `postings/` collection

**Out of Scope for This Plan:**
- ❌ Reprojection (will be separate phase)
- ❌ Validation & comparison tools (will be separate phase)
- ❌ Frontend cutover (will be separate phase)

After this phase:
- ✅ Phase 1 code completely removed
- ✅ All users have complete event streams in `users/{uid}/events/`
- ✅ Event metadata (`eventMeta/meta.lastSeq`) accurate
- ⏳ Projections still need replay (next phase)

---

## Current State Analysis

### Existing Infrastructure (Phase 2.2)

**Event System (Working):**
- ✅ [`appendPostCreatedEvent()`](functions/src/eventSourcing/append/appendEvent.ts) - Creates events for new posts
- ✅ [`onPostingCreated`](functions/src/postings/onPostingCreated.ts#L59-L66) - Dual-write active
- ✅ Event storage: `users/{uid}/events/{seq}`
- ✅ Metadata tracking: `users/{uid}/eventMeta/meta.lastSeq`

**Phase 1 Code (TO DELETE):**
- ⚠️ [`calculatePostingTransitions()`](functions/src/postings/onPostingCreated.ts#L44) - Legacy state machine
- ⚠️ [`updateRecoveryStatusOnMidnightV2`](functions/src/index.ts#L28-L30) - Midnight scheduler
- ⚠️ `functions/src/recoveryStatus/` directory - Entire legacy module
- ⚠️ Writes to `users/{uid}/streakInfo/current`

**Database State:**
```
users/{uid}/
├── events/              ✅ Partial event stream (only new posts since Phase 2.1)
├── eventMeta/meta       ✅ Metadata with lastSeq
├── postings/            ✅ Complete history - source of truth for backfill
├── streakInfo/current   ⚠️  Phase 1 state (keep for now, delete later)
└── streak_es/
    ├── currentPhase1    ⚠️  Phase 1 projection (delete)
    └── currentPhase2    ✅ Phase 2 projection (canonical)
```

---

## Step 1: Remove Phase 1 Code

**Goal:** Clean deletion of legacy state-based system without feature flags.

### 1.1 Remove Phase 1 Function Calls

**File:** [`functions/src/postings/onPostingCreated.ts`](functions/src/postings/onPostingCreated.ts)

**Delete lines 27-57** (entire Phase 1 block):
```typescript
// ❌ DELETE THIS ENTIRE BLOCK
try {
  // Get posting creation date and convert to Seoul timezone
  let postCreatedAt: Date;

  if (postingData.createdAt) {
    postCreatedAt = postingData.createdAt.toDate();
  } else {
    console.warn(`[PostingCreated] Warning: createdAt is missing for posting ${postingId}, using current Seoul time as fallback`);
    postCreatedAt = convertToSeoulTime(new Date());
  }

  const seoulDate = convertToSeoulTime(postCreatedAt);

  console.log(`[PostingCreated] Post created at: ${seoulDate.toISOString()} (Seoul timezone)`);

  // Process state transitions based on posting creation
  const dbUpdate = await calculatePostingTransitions(userId, seoulDate);
  if (dbUpdate) {
    // Update streak info first
    await updateStreakInfo(userId, dbUpdate.updates);
    console.log(`[StateTransition] User ${userId}: ${dbUpdate.reason}`, JSON.stringify(dbUpdate, null, 2));

    // If recovery was completed, add recovery history to subcollection
    if (dbUpdate.recoveryHistory) {
      await addRecoveryHistoryToSubcollection(userId, dbUpdate.recoveryHistory);
      console.log(`[RecoveryHistory] Recovery completed for user ${userId}`);
    }
  }

  console.log(`[PostingCreated] Successfully processed transitions for user: ${userId}`);
} catch (error) {
  console.error(`[PostingCreated] Error processing posting creation for user ${userId}:`, error);
}
```

**Keep only event appending:**
```typescript
export const onPostingCreated = onDocumentCreated(
  'users/{userId}/postings/{postingId}',
  async (event) => {
    const postingData = event.data?.data() as Posting;
    if (!postingData) {
      console.error('No posting data found in event');
      return null;
    }

    const { userId, postingId } = event.params;

    if (!userId) {
      console.error('Missing userId in event parameters');
      return null;
    }

    console.log(`[PostingCreated] Processing posting created for user: ${userId}, posting: ${postingId}`);

    try {
      // Append to event stream
      await appendPostCreatedEvent({
        userId,
        postId: postingData.post.id,
        boardId: postingData.board.id,
        contentLength: postingData.post.contentLength,
      });
      console.log(`[EventSourcing] Appended PostCreated event for user ${userId}`);
    } catch (error) {
      console.error(`[PostingCreated] Error appending event for user ${userId}:`, error);
    }

    return null;
  }
);
```

### 1.2 Remove Phase 1 Exports

**File:** [`functions/src/index.ts`](functions/src/index.ts)

**Delete:**
```typescript
export {
  updateRecoveryStatusOnMidnightV2  // ❌ DELETE
} from './recoveryStatus';
```

### 1.3 Delete Phase 1 Module

**Delete entire directory:**
```bash
rm -rf functions/src/recoveryStatus/
```

**Files being deleted:**
- `streakCalculations.ts` - Legacy streak computation
- `streakUtils.ts` - Legacy state updates
- `stateTransitions.ts` - Phase 1 state machine
- `StreakInfo.ts` - Type definitions (keep if used elsewhere)
- `__tests__/` - Legacy tests

### 1.4 Update Phase 1 Projection (Deprecate)

**File:** [`functions/src/eventSourcing/projection/projectStreakForUser.ts`](functions/src/eventSourcing/projection/projectStreakForUser.ts)

**Remove Phase 1 dual-write:**

**Before (lines 41-91):**
```typescript
export async function projectStreakForUser(userId: string): Promise<void> {
  await db.runTransaction(async (transaction: Transaction) => {
    // Read both Phase 1 and Phase 2 projections
    const phase1Ref = db.doc(`users/${userId}/streak_es/currentPhase1`);
    const phase2Ref = db.doc(`users/${userId}/streak_es/currentPhase2`);

    const [phase1Snap, phase2Snap] = await transaction.getAll(phase1Ref, phase2Ref);

    const phase1State: StreamProjectionPhase1 = phase1Snap.exists
      ? (phase1Snap.data() as StreamProjectionPhase1)
      : createInitialProjection();

    const phase2State: StreamProjectionPhase2 = phase2Snap.exists
      ? (phase2Snap.data() as StreamProjectionPhase2)
      : createInitialPhase2Projection();

    // Fetch events from the minimum appliedSeq
    const minAppliedSeq = Math.min(phase1State.appliedSeq, phase2State.appliedSeq);

    // ... apply events to both ...

    // Write both projections
    transaction.set(phase1Ref, newPhase1State);
    transaction.set(phase2Ref, newPhase2State);
  });
}
```

**After (Phase 2 only):**
```typescript
/**
 * Projects new events for a user into their Phase 2 projection.
 * Phase 3: Phase 1 removed - only Phase 2 canonical projection.
 */
export async function projectStreakForUser(userId: string): Promise<void> {
  await db.runTransaction(async (transaction: Transaction) => {
    const phase2Ref = db.doc(`users/${userId}/streak_es/currentPhase2`);
    const phase2Snap = await transaction.get(phase2Ref);

    const phase2State: StreamProjectionPhase2 = phase2Snap.exists
      ? (phase2Snap.data() as StreamProjectionPhase2)
      : createInitialPhase2Projection();

    // Fetch events from current appliedSeq
    const eventsQuery = db
      .collection(`users/${userId}/events`)
      .where('seq', '>', phase2State.appliedSeq)
      .orderBy('seq', 'asc')
      .limit(500);

    const eventsSnap = await transaction.get(eventsQuery);

    if (eventsSnap.empty) {
      return;
    }

    const events = eventsSnap.docs.map((doc: QueryDocumentSnapshot) => doc.data() as Event);

    // Get user timezone
    const profileRef = db.doc(`users/${userId}`);
    const profileSnap = await transaction.get(profileRef);
    const timezone = profileSnap.data()?.profile?.timezone ?? 'Asia/Seoul';

    // Apply events to Phase 2 projection
    const newPhase2State = applyEventsToPhase2Projection(phase2State, events, timezone);

    // Write Phase 2 projection only
    transaction.set(phase2Ref, newPhase2State);

    console.log(
      `[Projector] Updated Phase2 projection (seq ${phase2State.appliedSeq} → ${newPhase2State.appliedSeq}) for user ${userId}`,
    );
  });
}
```

### 1.5 Clean Up Imports

Remove unused imports from files:
- `StreamProjectionPhase1` type
- `applyEventsToProjection` (Phase 1 reducer)
- `createInitialProjection` (Phase 1 initial state)
- Any other Phase 1-specific imports

### Success Criteria
- ✅ No Phase 1 code in `functions/src/`
- ✅ `onPostingCreated` only appends events
- ✅ `projectStreakForUser` only updates Phase 2
- ✅ Builds without errors: `npm run build`
- ✅ No references to deleted files

---

## Step 2: Backfill Historical Events

**Goal:** Generate complete event stream from `postings/` collection.

### 2.1 Architecture: Functional Core, Imperative Shell

**Design Principle:**
- **Functional Core** = Pure business logic (testable, deterministic)
- **Imperative Shell** = Database I/O (Firestore reads/writes)

### 2.2 Functional Core: Event Extraction

**File:** `functions/src/eventSourcing/backfill/extractEventsFromPostings.ts` (new)

**Pure Functions:**

```typescript
import { Timestamp } from 'firebase-admin/firestore';
import { Event, EventType } from '../types/Event';

/**
 * Posting document from Firestore (external shape)
 */
export interface PostingDocument {
  post: {
    id: string;
    contentLength: number;
  };
  board: {
    id: string;
  };
  createdAt: Timestamp;
}

/**
 * Pure function: Extract events from posting documents
 *
 * Business Rules:
 * 1. Events are ordered by posting createdAt (chronological)
 * 2. seq starts from 1 and increments sequentially
 * 3. dayKey is computed from posting createdAt + user timezone
 * 4. Skip postings with missing required fields
 *
 * @param postings - Array of posting documents (must be sorted by createdAt ASC)
 * @param timezone - User timezone for dayKey computation
 * @param startSeq - Starting sequence number (default: 1)
 * @returns Array of events ordered by seq
 */
export function extractEventsFromPostings(
  postings: PostingDocument[],
  timezone: string,
  startSeq: number = 1,
): Event[] {
  const events: Event[] = [];
  let seq = startSeq;

  for (const posting of postings) {
    // Skip invalid postings
    if (!posting.post?.id || !posting.createdAt) {
      continue;
    }

    const dayKey = computeDayKeyFromTimestamp(posting.createdAt, timezone);

    const event: Event = {
      seq,
      type: EventType.POST_CREATED,
      createdAt: posting.createdAt,
      dayKey,
      payload: {
        postId: posting.post.id,
        boardId: posting.board?.id ?? 'unknown',
        contentLength: posting.post.contentLength ?? 0,
      },
    };

    events.push(event);
    seq++;
  }

  return events;
}

/**
 * Pure helper: Compute dayKey from Timestamp
 * (Re-implementation of computeDayKey for testing)
 */
function computeDayKeyFromTimestamp(timestamp: Timestamp, timezone: string): string {
  const date = timestamp.toDate();

  // Convert to timezone
  const dateStr = date.toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Parse MM/DD/YYYY to YYYY-MM-DD
  const [month, day, year] = dateStr.split(/[/,\s]+/);
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Pure function: Detect existing events to avoid duplicates
 *
 * @param eventsToCreate - New events to be created
 * @param existingPostIds - Set of postIds that already have events
 * @returns Filtered events that don't duplicate existing ones
 */
export function filterDuplicateEvents(
  eventsToCreate: Event[],
  existingPostIds: Set<string>,
): Event[] {
  return eventsToCreate.filter(event => {
    if (event.type !== EventType.POST_CREATED) return true;
    return !existingPostIds.has(event.payload.postId);
  });
}

/**
 * Pure function: Renumber events sequentially after filtering
 *
 * @param events - Events to renumber
 * @param startSeq - Starting sequence number
 * @returns Events with updated seq numbers
 */
export function renumberEvents(events: Event[], startSeq: number): Event[] {
  return events.map((event, index) => ({
    ...event,
    seq: startSeq + index,
  }));
}
```

### 2.3 Imperative Shell: Firestore Integration

**File:** `functions/src/eventSourcing/backfill/backfillUserEventsDb.ts` (new)

**Database I/O Layer:**

```typescript
import admin from '../../shared/admin';
import { Timestamp, WriteBatch } from 'firebase-admin/firestore';
import { Event, EventType } from '../types/Event';
import {
  PostingDocument,
  extractEventsFromPostings,
  filterDuplicateEvents,
  renumberEvents,
} from './extractEventsFromPostings';

const db = admin.firestore();

export interface BackfillStats {
  userId: string;
  postingsFound: number;
  eventsCreated: number;
  eventsSkipped: number;
  finalLastSeq: number;
  error?: string;
}

/**
 * Imperative Shell: Backfill events for a single user
 *
 * Process:
 * 1. Fetch user timezone
 * 2. Fetch all postings (ordered by createdAt)
 * 3. Fetch existing events to detect duplicates
 * 4. Extract new events (functional core)
 * 5. Write events in batches (max 500 per batch)
 * 6. Update eventMeta.lastSeq
 *
 * Idempotent: Safe to re-run - skips existing events
 */
export async function backfillUserEvents(userId: string): Promise<BackfillStats> {
  const stats: BackfillStats = {
    userId,
    postingsFound: 0,
    eventsCreated: 0,
    eventsSkipped: 0,
    finalLastSeq: 0,
  };

  try {
    // 1. Fetch user timezone
    const userDoc = await db.doc(`users/${userId}`).get();
    if (!userDoc.exists) {
      stats.error = 'User not found';
      return stats;
    }
    const timezone = userDoc.data()?.profile?.timezone ?? 'Asia/Seoul';

    // 2. Fetch all postings (ordered by createdAt ASC)
    const postingsSnapshot = await db
      .collection(`users/${userId}/postings`)
      .orderBy('createdAt', 'asc')
      .get();

    stats.postingsFound = postingsSnapshot.size;

    if (postingsSnapshot.empty) {
      console.log(`[Backfill] User ${userId}: No postings found`);
      return stats;
    }

    const postings = postingsSnapshot.docs.map(
      doc => doc.data() as PostingDocument
    );

    // 3. Fetch existing events to detect duplicates
    const existingEventsSnapshot = await db
      .collection(`users/${userId}/events`)
      .where('type', '==', EventType.POST_CREATED)
      .get();

    const existingPostIds = new Set<string>();
    for (const doc of existingEventsSnapshot.docs) {
      const event = doc.data() as Event;
      if (event.type === EventType.POST_CREATED) {
        existingPostIds.add(event.payload.postId);
      }
    }

    // 4. Extract events (functional core)
    const allEvents = extractEventsFromPostings(postings, timezone, 1);

    // Filter duplicates
    const newEvents = filterDuplicateEvents(allEvents, existingPostIds);

    // Calculate starting seq (after existing events)
    const existingSeqNumbers = existingEventsSnapshot.docs.map(
      doc => (doc.data() as Event).seq
    );
    const maxExistingSeq = existingSeqNumbers.length > 0
      ? Math.max(...existingSeqNumbers)
      : 0;

    // Renumber new events to append after existing
    const finalEvents = renumberEvents(newEvents, maxExistingSeq + 1);

    stats.eventsSkipped = allEvents.length - finalEvents.length;

    if (finalEvents.length === 0) {
      console.log(`[Backfill] User ${userId}: All events already exist`);
      return stats;
    }

    // 5. Write events in batches (Firestore limit: 500 writes per batch)
    const batchSize = 500;
    for (let i = 0; i < finalEvents.length; i += batchSize) {
      const batchEvents = finalEvents.slice(i, i + batchSize);
      await writeBatchEvents(userId, batchEvents);
    }

    stats.eventsCreated = finalEvents.length;
    stats.finalLastSeq = finalEvents[finalEvents.length - 1].seq;

    // 6. Update eventMeta.lastSeq
    await db.doc(`users/${userId}/eventMeta/meta`).set(
      { lastSeq: stats.finalLastSeq },
      { merge: true }
    );

    console.log(
      `[Backfill] User ${userId}: ✅ Created ${stats.eventsCreated} events ` +
      `(skipped ${stats.eventsSkipped} duplicates, final seq: ${stats.finalLastSeq})`
    );

  } catch (error) {
    stats.error = error instanceof Error ? error.message : String(error);
    console.error(`[Backfill] User ${userId}: ❌ Error:`, stats.error);
  }

  return stats;
}

/**
 * Helper: Write batch of events to Firestore
 */
async function writeBatchEvents(userId: string, events: Event[]): Promise<void> {
  const batch = db.batch();

  for (const event of events) {
    const eventId = event.seq.toString().padStart(10, '0');
    const eventRef = db.doc(`users/${userId}/events/${eventId}`);
    batch.set(eventRef, event);
  }

  await batch.commit();
}
```

### 2.4 Batch Processing for All Users

**File:** `functions/src/eventSourcing/backfill/backfillAllUsersDb.ts` (new)

```typescript
import admin from '../../shared/admin';
import { backfillUserEvents, BackfillStats } from './backfillUserEventsDb';

const db = admin.firestore();

export interface AggregateStats {
  totalUsers: number;
  usersProcessed: number;
  totalEventsCreated: number;
  errors: string[];
  userStats: BackfillStats[];
}

/**
 * Backfill events for all users in batches
 *
 * @param batchSize - Number of users to process in parallel (default: 10)
 */
export async function backfillAllUsers(batchSize: number = 10): Promise<AggregateStats> {
  const stats: AggregateStats = {
    totalUsers: 0,
    usersProcessed: 0,
    totalEventsCreated: 0,
    errors: [],
    userStats: [],
  };

  // Fetch all user IDs
  const usersSnapshot = await db.collection('users').select().get();
  const userIds = usersSnapshot.docs.map(doc => doc.id);

  stats.totalUsers = userIds.length;
  console.log(`[Backfill] Starting backfill for ${stats.totalUsers} users`);

  // Process in batches
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(userId => backfillUserEvents(userId))
    );

    // Aggregate stats
    for (const result of results) {
      stats.userStats.push(result);
      stats.usersProcessed++;
      stats.totalEventsCreated += result.eventsCreated;

      if (result.error) {
        stats.errors.push(`${result.userId}: ${result.error}`);
      }
    }

    console.log(
      `[Backfill] Progress: ${Math.min(i + batchSize, userIds.length)}/${userIds.length} users ` +
      `(${stats.totalEventsCreated} events created)`
    );
  }

  console.log(`[Backfill] Complete: ${stats.totalEventsCreated} events created for ${stats.usersProcessed} users`);
  console.log(`[Backfill] Errors: ${stats.errors.length}`);

  return stats;
}
```

### 2.5 HTTP Function

**File:** `functions/src/eventSourcing/backfill/backfillEventsHttp.ts` (new)

```typescript
import { onRequest } from 'firebase-functions/v2/https';
import { backfillUserEvents } from './backfillUserEventsDb';
import { backfillAllUsers } from './backfillAllUsersDb';

export const backfillHistoricalEventsHttp = onRequest({
  timeoutSeconds: 540,
  memory: '2GiB',
  maxInstances: 1,
  cors: true,
}, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const userId = req.query.userId as string | undefined;
    const all = req.query.all === 'true';

    if (userId) {
      const stats = await backfillUserEvents(userId);
      res.status(200).json({ success: true, mode: 'single', stats });
    } else if (all) {
      const stats = await backfillAllUsers();
      res.status(200).json({ success: true, mode: 'all', stats });
    } else {
      res.status(400).json({ error: 'Missing param: userId or all=true' });
    }
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});
```

### 2.6 Export Function

**File:** [`functions/src/index.ts`](functions/src/index.ts)

Add:
```typescript
export {
  backfillHistoricalEventsHttp
} from './eventSourcing/backfill/backfillEventsHttp';
```

---

## Testing Strategy

### Test-First Development

**Write tests BEFORE implementation, wait for confirmation, then make tests pass.**

### Test File Structure

```
functions/src/eventSourcing/backfill/
├── __tests__/
│   ├── extractEventsFromPostings.test.ts  (Functional Core Tests)
│   └── backfillUserEventsDb.test.ts       (Integration Tests)
├── extractEventsFromPostings.ts
├── backfillUserEventsDb.ts
├── backfillAllUsersDb.ts
└── backfillEventsHttp.ts
```

### 2.7 Functional Core Tests

**File:** `functions/src/eventSourcing/backfill/__tests__/extractEventsFromPostings.test.ts` (new)

```typescript
import { describe, it, expect } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import {
  extractEventsFromPostings,
  filterDuplicateEvents,
  renumberEvents,
  PostingDocument,
} from '../extractEventsFromPostings';
import { EventType } from '../../types/Event';

describe('Event Extraction (Functional Core)', () => {
  describe('extractEventsFromPostings', () => {
    describe('when given valid postings', () => {
      it('creates events with sequential seq numbers starting from 1', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: 'post1', contentLength: 100 },
            board: { id: 'board1' },
            createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          },
          {
            post: { id: 'post2', contentLength: 200 },
            board: { id: 'board1' },
            createdAt: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 1);

        expect(events).toHaveLength(2);
        expect(events[0].seq).toBe(1);
        expect(events[1].seq).toBe(2);
      });

      it('uses custom starting seq number', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: 'post1', contentLength: 100 },
            board: { id: 'board1' },
            createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 10);

        expect(events[0].seq).toBe(10);
      });

      it('computes dayKey in user timezone', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: 'post1', contentLength: 100 },
            board: { id: 'board1' },
            // UTC: 2024-01-15 23:00 → Seoul (UTC+9): 2024-01-16 08:00
            createdAt: Timestamp.fromDate(new Date('2024-01-15T23:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 1);

        expect(events[0].dayKey).toBe('2024-01-16');
      });

      it('creates POST_CREATED events with correct payload', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: 'post123', contentLength: 500 },
            board: { id: 'board456' },
            createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 1);

        expect(events[0]).toMatchObject({
          type: EventType.POST_CREATED,
          payload: {
            postId: 'post123',
            boardId: 'board456',
            contentLength: 500,
          },
        });
      });
    });

    describe('when postings have missing fields', () => {
      it('skips postings with missing post.id', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: '', contentLength: 100 },
            board: { id: 'board1' },
            createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          },
          {
            post: { id: 'post2', contentLength: 200 },
            board: { id: 'board1' },
            createdAt: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 1);

        expect(events).toHaveLength(1);
        expect(events[0].payload.postId).toBe('post2');
      });

      it('skips postings with missing createdAt', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: 'post1', contentLength: 100 },
            board: { id: 'board1' },
            createdAt: null as any,
          },
          {
            post: { id: 'post2', contentLength: 200 },
            board: { id: 'board1' },
            createdAt: Timestamp.fromDate(new Date('2024-01-16T10:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 1);

        expect(events).toHaveLength(1);
        expect(events[0].payload.postId).toBe('post2');
      });

      it('uses "unknown" for missing boardId', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: 'post1', contentLength: 100 },
            board: { id: '' },
            createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 1);

        expect(events[0].payload.boardId).toBe('unknown');
      });

      it('uses 0 for missing contentLength', () => {
        const postings: PostingDocument[] = [
          {
            post: { id: 'post1', contentLength: undefined as any },
            board: { id: 'board1' },
            createdAt: Timestamp.fromDate(new Date('2024-01-15T10:00:00Z')),
          },
        ];

        const events = extractEventsFromPostings(postings, 'Asia/Seoul', 1);

        expect(events[0].payload.contentLength).toBe(0);
      });
    });

    describe('when postings array is empty', () => {
      it('returns empty array', () => {
        const events = extractEventsFromPostings([], 'Asia/Seoul', 1);

        expect(events).toEqual([]);
      });
    });
  });

  describe('filterDuplicateEvents', () => {
    describe('when no duplicates exist', () => {
      it('returns all events', () => {
        const events = [
          {
            seq: 1,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2024-01-15',
            payload: { postId: 'post1', boardId: 'board1', contentLength: 100 },
          },
          {
            seq: 2,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2024-01-16',
            payload: { postId: 'post2', boardId: 'board1', contentLength: 200 },
          },
        ];

        const filtered = filterDuplicateEvents(events, new Set());

        expect(filtered).toHaveLength(2);
      });
    });

    describe('when duplicates exist', () => {
      it('filters out events with existing postIds', () => {
        const events = [
          {
            seq: 1,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2024-01-15',
            payload: { postId: 'post1', boardId: 'board1', contentLength: 100 },
          },
          {
            seq: 2,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2024-01-16',
            payload: { postId: 'post2', boardId: 'board1', contentLength: 200 },
          },
        ];

        const existingPostIds = new Set(['post1']);
        const filtered = filterDuplicateEvents(events, existingPostIds);

        expect(filtered).toHaveLength(1);
        expect(filtered[0].payload.postId).toBe('post2');
      });
    });
  });

  describe('renumberEvents', () => {
    describe('when starting seq is 1', () => {
      it('assigns seq numbers 1, 2, 3...', () => {
        const events = [
          {
            seq: 99,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2024-01-15',
            payload: { postId: 'post1', boardId: 'board1', contentLength: 100 },
          },
          {
            seq: 100,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2024-01-16',
            payload: { postId: 'post2', boardId: 'board1', contentLength: 200 },
          },
        ];

        const renumbered = renumberEvents(events, 1);

        expect(renumbered[0].seq).toBe(1);
        expect(renumbered[1].seq).toBe(2);
      });
    });

    describe('when starting seq is custom', () => {
      it('assigns seq numbers starting from custom value', () => {
        const events = [
          {
            seq: 1,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2024-01-15',
            payload: { postId: 'post1', boardId: 'board1', contentLength: 100 },
          },
        ];

        const renumbered = renumberEvents(events, 50);

        expect(renumbered[0].seq).toBe(50);
      });
    });

    describe('when events array is empty', () => {
      it('returns empty array', () => {
        const renumbered = renumberEvents([], 1);

        expect(renumbered).toEqual([]);
      });
    });
  });
});
```

### 2.8 Integration Tests (Database Layer)

**File:** `functions/src/eventSourcing/backfill/__tests__/backfillUserEventsDb.test.ts` (new)

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { backfillUserEvents } from '../backfillUserEventsDb';
// Mock Firestore - implementation TBD based on existing test patterns
```

**Note:** Integration tests will mock Firestore to test the imperative shell. Write these after functional core tests pass.

---

## Rollback Strategy

### If Backfill Creates Bad Data

**Cleanup Script:**
```typescript
// Delete all events for a user
async function deleteUserEvents(userId: string): Promise<void> {
  const db = admin.firestore();
  const eventsRef = db.collection(`users/${userId}/events`);

  const snapshot = await eventsRef.get();
  const batches: WriteBatch[] = [];
  let currentBatch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    currentBatch.delete(doc.ref);
    batchCount++;

    if (batchCount === 500) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    batches.push(currentBatch);
  }

  for (const batch of batches) {
    await batch.commit();
  }

  // Reset eventMeta
  await db.doc(`users/${userId}/eventMeta/meta`).set({ lastSeq: 0 }, { merge: true });
}
```

---

## Success Metrics

### Step 1: Phase 1 Removal
- ✅ No `recoveryStatus/` directory
- ✅ `onPostingCreated` only calls `appendPostCreatedEvent`
- ✅ `projectStreakForUser` only updates Phase 2
- ✅ Build succeeds: `npm run build`
- ✅ Tests pass: `npm test`

### Step 2: Backfill
- ✅ All functional core tests pass (100% coverage)
- ✅ Test user has complete event stream
- ✅ `eventMeta.lastSeq` matches posting count
- ✅ No seq gaps or duplicates
- ✅ All users processed without errors

---

## Execution Checklist

### Pre-Deployment
- [ ] All tests written and reviewed
- [ ] Tests pass locally
- [ ] Code reviewed by team

### Deployment
- [ ] Deploy Step 1 (Phase 1 removal)
- [ ] Monitor for 24h - verify no Phase 1 writes
- [ ] Deploy Step 2 (backfill function)
- [ ] Test on single user
- [ ] Run for all users

### Post-Deployment
- [ ] Verify all users have event streams
- [ ] Spot-check 10 random users for accuracy
- [ ] Monitor error logs
- [ ] Document any issues

---

**Document Version:** 1.0 (Focused: Freeze + Backfill Only)
**Author:** Claude Code
**Date:** 2025-10-29
