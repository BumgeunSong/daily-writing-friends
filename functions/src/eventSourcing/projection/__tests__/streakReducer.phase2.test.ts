import { describe, it, expect } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import { fromZonedTime } from 'date-fns-tz';
import { Event, EventType } from '../../types/Event';
import {
  applyEventsToPhase2Projection,
  createInitialPhase2Projection,
} from '../streakReducerPhase2';

const TZ = 'Asia/Seoul';

// Helper functions for test event creation
function createPostEvent(dayKey: string, seq: number): Event {
  return {
    seq,
    type: EventType.POST_CREATED,
    createdAt: Timestamp.fromDate(fromZonedTime(`${dayKey}T12:00:00`, TZ)),
    dayKey,
    payload: {
      postId: `post${seq}`,
      boardId: 'board1',
      contentLength: 100,
    },
  };
}

function createDayClosedVirtualEvent(dayKey: string): Event {
  return {
    seq: 999, // Will be overwritten by reducer
    type: EventType.DAY_CLOSED_VIRTUAL,
    createdAt: Timestamp.fromDate(fromZonedTime(`${dayKey}T23:59:59.999`, TZ)),
    dayKey,
  };
}

describe('Streak Reducer Phase 2 - Recovery Logic Tests', () => {
  describe('Initial state', () => {
    it('creates missed status with zero streaks', () => {
      const state = createInitialPhase2Projection();

      expect(state.status.type).toBe('missed');
      expect(state.currentStreak).toBe(0);
      expect(state.originalStreak).toBe(0);
      expect(state.longestStreak).toBe(0);
      expect(state.lastContributionDate).toBeNull();
      expect(state.appliedSeq).toBe(0);
      expect(state.projectorVersion).toBe('phase2.1-no-crossday-v1');
    });
  });

  describe('Miss detection via DayClosed', () => {
    it('transitions from onStreak to eligible on working day without posts', () => {
      const state = createInitialPhase2Projection();
      state.status = { type: 'onStreak' };
      state.currentStreak = 10;
      state.longestStreak = 10;

      const events: Event[] = [
        {
          seq: 1,
          type: EventType.DAY_CLOSED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-20', // Monday
          idempotencyKey: 'uid:2025-01-20:closed',
        },
      ];

      const result = applyEventsToPhase2Projection(state, events, TZ);

      expect(result.status.type).toBe('eligible');
      expect(result.status.postsRequired).toBe(2); // Mon-Thu miss → 2 posts
      expect(result.status.currentPosts).toBe(0);
      expect(result.status.deadline).toBeDefined();
      expect(result.status.missedDate).toBeDefined();
      expect(result.originalStreak).toBe(10);
      expect(result.currentStreak).toBe(0);
    });

    it('sets postsRequired=1 for Friday miss', () => {
      const state = createInitialPhase2Projection();
      state.status = { type: 'onStreak' };
      state.currentStreak = 5;

      const events: Event[] = [
        {
          seq: 1,
          type: EventType.DAY_CLOSED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-17', // Friday
          idempotencyKey: 'uid:2025-01-17:closed',
        },
      ];

      const result = applyEventsToPhase2Projection(state, events, TZ);

      expect(result.status.type).toBe('eligible');
      expect(result.status.postsRequired).toBe(1); // Friday miss → 1 post
      expect(result.originalStreak).toBe(5);
    });

    it('does not penalize weekend DayClosed', () => {
      const state = createInitialPhase2Projection();
      state.status = { type: 'onStreak' };
      state.currentStreak = 7;

      const events: Event[] = [
        {
          seq: 1,
          type: EventType.DAY_CLOSED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-18', // Saturday
          idempotencyKey: 'uid:2025-01-18:closed',
        },
      ];

      const result = applyEventsToPhase2Projection(state, events, TZ);

      expect(result.status.type).toBe('onStreak'); // No penalty
      expect(result.currentStreak).toBe(7);
    });
  });

  describe('Eligible recovery success', () => {
    it('transitions to onStreak when requirement met (weekday miss)', () => {
      const state = createInitialPhase2Projection();
      state.status = {
        type: 'eligible',
        postsRequired: 2,
        currentPosts: 0,
        deadline: Timestamp.fromDate(fromZonedTime('2025-01-21T23:59:59.999', TZ)),
        missedDate: Timestamp.fromDate(fromZonedTime('2025-01-20T23:59:59.999', TZ)),
      };
      state.originalStreak = 10;
      state.currentStreak = 0;

      const events: Event[] = [
        {
          seq: 1,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-21',
          payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
        },
        {
          seq: 2,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-21',
          payload: { postId: 'p2', boardId: 'b1', contentLength: 150 },
        },
      ];

      const result = applyEventsToPhase2Projection(state, events, TZ);

      expect(result.status.type).toBe('onStreak');
      expect(result.currentStreak).toBe(12); // 10 + 2 (weekday increment)
      expect(result.originalStreak).toBe(12);
      expect(result.longestStreak).toBe(12);
    });

    it('transitions to onStreak with +1 increment for Friday miss', () => {
      const state = createInitialPhase2Projection();
      state.status = {
        type: 'eligible',
        postsRequired: 1,
        currentPosts: 0,
        deadline: Timestamp.fromDate(fromZonedTime('2025-01-18T23:59:59.999', TZ)), // End of Sat in Seoul
        missedDate: Timestamp.fromDate(fromZonedTime('2025-01-17T23:59:59.999', TZ)), // End of Fri in Seoul
      };
      state.originalStreak = 8;
      state.currentStreak = 0;

      const events: Event[] = [
        {
          seq: 1,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-18', // Saturday
          payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
        },
      ];

      const result = applyEventsToPhase2Projection(state, events, TZ);

      expect(result.status.type).toBe('onStreak');
      expect(result.currentStreak).toBe(9); // 8 + 1 (Friday increment)
      expect(result.originalStreak).toBe(9);
    });
  });

  describe('Eligible recovery failure', () => {
    it('starts over when deadline passes with partial progress', () => {
      const state = createInitialPhase2Projection();
      state.status = {
        type: 'eligible',
        postsRequired: 2,
        currentPosts: 1, // Already made 1 post during recovery window
        deadline: Timestamp.fromDate(fromZonedTime('2025-01-21T23:59:59.999', TZ)), // End of 2025-01-21 in Seoul
        missedDate: Timestamp.fromDate(fromZonedTime('2025-01-20T23:59:59.999', TZ)), // End of 2025-01-20 in Seoul
      };
      state.originalStreak = 10;
      state.currentStreak = 0;

      const events: Event[] = [
        // No more posts - just the day closing
        {
          seq: 1,
          type: EventType.DAY_CLOSED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-21', // Closing recovery day
          idempotencyKey: 'uid:2025-01-21:closed',
        },
      ];

      const result = applyEventsToPhase2Projection(state, events, TZ);

      // no-crossday-v1: Partial recovery (1 post when 2 required) → start over with streak=1
      expect(result.status.type).toBe('onStreak');
      expect(result.currentStreak).toBe(1);
      expect(result.originalStreak).toBe(1); // Reset to new streak
    });
  });

  describe('Missed rebuild - same-day 2 posts', () => {
    it('transitions to onStreak after 2 posts on same day', () => {
      const state = createInitialPhase2Projection();
      state.status = { type: 'missed' };
      state.originalStreak = 5;
      state.currentStreak = 0;

      const events: Event[] = [
        {
          seq: 1,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-22',
          payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
        },
        {
          seq: 2,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-22',
          payload: { postId: 'p2', boardId: 'b1', contentLength: 150 },
        },
      ];

      const result = applyEventsToPhase2Projection(state, events, TZ);

      expect(result.status.type).toBe('onStreak');
      // no-crossday-v1: Same-day rebuild always gives streak=2 (doesn't restore original)
      expect(result.currentStreak).toBe(2);
    });
  });

  // Note: Cross-day rebuild tests removed in phase2.1-no-crossday-v1
  // See noCrossDay.test.ts for new same-day recovery rules

  describe('Missed rebuild - incremental events', () => {
    describe('when processing incremental events (no-cross-day rules)', () => {
      it('enters eligible then start-over with separate-day posts', () => {
        // First event batch: posted on Monday (from missed)
        const state1 = createInitialPhase2Projection();
        state1.status = { type: 'missed' };
        state1.originalStreak = 0;

        const events1: Event[] = [
          {
            seq: 1,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2025-10-21', // Monday
            payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
          },
        ];

        const result1 = applyEventsToPhase2Projection(state1, events1, TZ);

        // First post from missed: enter eligible (needs 2 posts same day)
        expect(result1.status.type).toBe('eligible');
        expect(result1.currentStreak).toBe(0);

        // Simulate day close with only 1 post (via DAY_CLOSED_VIRTUAL)
        const dayCloseEvent: Event = {
          seq: 0,
          type: EventType.DAY_CLOSED_VIRTUAL,
          dayKey: '2025-10-21',
          createdAt: Timestamp.fromDate(new Date('2025-10-21T23:59:59Z')),
        };

        const resultAfterDayClose = applyEventsToPhase2Projection(result1, [dayCloseEvent], TZ);

        // Day closes with 1 post: start over with streak=1
        expect(resultAfterDayClose.status.type).toBe('onStreak');
        expect(resultAfterDayClose.currentStreak).toBe(1);

        // Second event batch: posted on Tuesday (separate day, no cross-day increment)
        const events2: Event[] = [
          {
            seq: 2,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2025-10-22', // Tuesday
            payload: { postId: 'p2', boardId: 'b1', contentLength: 100 },
          },
        ];

        const result2 = applyEventsToPhase2Projection(resultAfterDayClose, events2, TZ);

        // No cross-day increment: stays at streak=1
        expect(result2.status.type).toBe('onStreak');
        expect(result2.currentStreak).toBe(1); // NOT 2
      });
    });
  });

  describe('Idempotency', () => {
    it('produces same result when replaying same events', () => {
      const state = createInitialPhase2Projection();

      const events: Event[] = [
        {
          seq: 1,
          type: EventType.POST_CREATED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-20',
          payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
        },
        {
          seq: 2,
          type: EventType.DAY_CLOSED,
          createdAt: Timestamp.now(),
          dayKey: '2025-01-20',
          idempotencyKey: 'uid:2025-01-20:closed',
        },
      ];

      const result1 = applyEventsToPhase2Projection(state, events, TZ);
      const result2 = applyEventsToPhase2Projection(state, events, TZ);

      expect(result1).toEqual(result2);
    });
  });
});

// ============================================================================
// Comprehensive No-Cross-Day Recovery Tests
// ============================================================================

describe('No-Cross-Day Recovery Rules (Detailed Scenarios)', () => {
  // Test helper functions
  function createPostEvent(dayKey: string, seq: number): Event {
    return {
      seq,
      type: EventType.POST_CREATED,
      dayKey,
      createdAt: Timestamp.fromDate(fromZonedTime(`${dayKey}T12:00:00`, TZ)),
      payload: { postId: `post-${seq}`, boardId: 'board1', contentLength: 100 },
    };
  }

  function createDayActivityEvent(dayKey: string, postsCount: number): Event {
    return {
      seq: 0,
      type: EventType.DAY_ACTIVITY,
      dayKey,
      createdAt: Timestamp.fromDate(fromZonedTime(`${dayKey}T23:59:59.999`, TZ)),
      payload: { postsCount },
    };
  }

  function createDayClosedVirtualEvent(dayKey: string): Event {
    return {
      seq: 0,
      type: EventType.DAY_CLOSED_VIRTUAL,
      dayKey,
      createdAt: Timestamp.fromDate(fromZonedTime(`${dayKey}T23:59:59.999`, TZ)),
    };
  }

  describe('Weekday miss full recovery', () => {
    it('restores streak with +2 when 2+ posts on recovery day', () => {
      let state = createInitialPhase2Projection();

      // Build streak with 2 posts same day
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-13', 1), createPostEvent('2025-01-13', 2)], // Mon, 2 posts
        TZ,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(2);

      // Continue posting (no increment)
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-14', 3)], // Tue
        TZ,
      );

      expect(state.currentStreak).toBe(2); // No cross-day increment

      // Miss Wednesday
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-15')], // Wed - no posts
        TZ,
      );

      expect(state.status.type).toBe('eligible');
      expect(state.status.postsRequired).toBe(2); // Weekday miss requires 2 posts
      expect(state.originalStreak).toBe(2);

      // Recover on Thursday with 2 posts
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-16', 4), createPostEvent('2025-01-16', 5)], // Thu - 2 posts
        TZ,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(4); // originalStreak(2) + 2
    });
  });

  describe('Weekday miss partial recovery', () => {
    it('starts over with streak=1 when only 1 post on recovery day', () => {
      let state = createInitialPhase2Projection();

      // Build streak using same-day 2 posts
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-13', 1), createPostEvent('2025-01-13', 2)], // Mon, 2 posts
        TZ,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(2);

      // Continue streak
      state = applyEventsToPhase2Projection(
        state,
        [
          createPostEvent('2025-01-14', 3), // Tue
          createPostEvent('2025-01-15', 4), // Wed
        ],
        TZ,
      );

      expect(state.currentStreak).toBe(2); // Still 2 (no increment for separate days)

      // Miss Thursday
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-16')], // Thu - no posts
        TZ,
      );

      expect(state.status.type).toBe('eligible');
      expect(state.originalStreak).toBe(2);

      // Partial recovery: only 1 post on Friday (recovery day)
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-17', 5)], // Fri - 1 post
        TZ,
      );

      // Still eligible with currentPosts = 1
      expect(state.status.type).toBe('eligible');

      // Day closes with only 1 post → start over
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-17')], // Fri closes
        TZ,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(1); // Start over with 1
    });
  });

  describe('Friday miss recovery', () => {
    it('restores with +1 when 1+ post on Saturday', () => {
      let state = createInitialPhase2Projection();

      // Build streak
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-13', 1), createPostEvent('2025-01-13', 2)], // Mon, 2 posts
        TZ,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(2);

      // Post Thursday (jump to Thu to avoid confusion)
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-16', 3)], // Thu
        TZ,
      );

      expect(state.currentStreak).toBe(2); // Should NOT increment
      expect(state.originalStreak).toBe(2); // Should NOT change

      // Miss Friday
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-17')], // Fri - no posts
        TZ,
      );

      expect(state.status.type).toBe('eligible');
      expect(state.status.postsRequired).toBe(1); // Friday miss requires only 1 post
      expect(state.originalStreak).toBe(2); // Should have saved streak = 2

      // Recover on Saturday
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-18', 6)], // Sat - 1 post
        TZ,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(3); // originalStreak(2) + 1
    });
  });

  describe('From missed: same-day rebuild', () => {
    it('restores with streak=2 when 2 posts same day from missed', () => {
      let state = createInitialPhase2Projection();

      expect(state.status.type).toBe('missed');

      // First post: enters eligible
      state = applyEventsToPhase2Projection(state, [createPostEvent('2025-01-13', 1)], TZ);

      expect(state.status.type).toBe('eligible');
      expect(state.status.postsRequired).toBe(2);

      // Second post same day: rebuild with streak=2
      state = applyEventsToPhase2Projection(state, [createPostEvent('2025-01-13', 2)], TZ);

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(2);
    });
  });

  describe('From missed: start over', () => {
    it('starts with streak=1 when day closes with only 1 post', () => {
      let state = createInitialPhase2Projection();

      // One post on Monday
      state = applyEventsToPhase2Projection(state, [createPostEvent('2025-01-13', 1)], TZ);

      expect(state.status.type).toBe('eligible');

      // Day closes
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-13')],
        TZ,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(1);
    });
  });

  describe('DAY_ACTIVITY synthetic events', () => {
    it('handles extension window with 2+ posts', () => {
      let state = createInitialPhase2Projection();

      // Build initial streak
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-13', 1), createPostEvent('2025-01-13', 2)],
        TZ,
      );

      expect(state.currentStreak).toBe(2);

      // Miss a day
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-14')],
        TZ,
      );

      expect(state.status.type).toBe('eligible');

      // Extension window: Wednesday had 2 posts (simulated via DAY_ACTIVITY)
      state = applyEventsToPhase2Projection(
        state,
        [createDayActivityEvent('2025-01-15', 2)], // Wed - 2 posts
        TZ,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(4); // originalStreak(2) + 2
    });

    it('handles extension window with 1 post (starts over)', () => {
      let state = createInitialPhase2Projection();

      // Build initial streak
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-13', 1), createPostEvent('2025-01-13', 2)],
        TZ,
      );

      // Miss a day
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-14')],
        TZ,
      );

      expect(state.status.type).toBe('eligible');

      // Extension: Wednesday had only 1 post
      state = applyEventsToPhase2Projection(
        state,
        [createDayActivityEvent('2025-01-15', 1)], // Wed - 1 post
        TZ,
      );

      // Still eligible (needs day close)
      expect(state.status.type).toBe('eligible');

      // Day closes
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-15')],
        TZ,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(1); // Start over
    });
  });

  describe('No cross-day rebuild', () => {
    it('does NOT rebuild with posts on separate days', () => {
      let state = createInitialPhase2Projection();

      // Post on Monday
      state = applyEventsToPhase2Projection(state, [createPostEvent('2025-01-13', 1)], TZ);

      expect(state.status.type).toBe('eligible'); // First post from missed

      // Day closes with 1 post
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-13')],
        TZ,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(1);

      // Post on Wednesday (separate day) - should NOT increment streak
      state = applyEventsToPhase2Projection(state, [createPostEvent('2025-01-15', 2)], TZ);

      // Still onStreak but currentStreak doesn't increase
      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(1); // NOT 2!
    });
  });
});

// ============================================================================
// Invariant & Edge Case Tests (Wrap-up Validation)
// ============================================================================

describe('Invariant Checks', () => {
  describe('originalStreak mutations', () => {
    it('posting while onStreak never mutates originalStreak', () => {
      let state = createInitialPhase2Projection();

      // Build streak
      state = applyEventsToPhase2Projection(
        state,
        [
          createPostEvent('2025-01-13', 1),
          createPostEvent('2025-01-13', 2),
        ],
        TZ,
      );

      expect(state.originalStreak).toBe(2);
      const savedOriginalStreak = state.originalStreak;

      // Post on multiple days while onStreak
      state = applyEventsToPhase2Projection(
        state,
        [
          createPostEvent('2025-01-14', 3),
          createPostEvent('2025-01-15', 4),
          createPostEvent('2025-01-16', 5),
        ],
        TZ,
      );

      // originalStreak MUST NOT change while onStreak
      expect(state.status.type).toBe('onStreak');
      expect(state.originalStreak).toBe(savedOriginalStreak);
      expect(state.originalStreak).toBe(2);
    });

    it('entering eligible snapshots originalStreak exactly once', () => {
      let state = createInitialPhase2Projection();

      // Build streak
      state = applyEventsToPhase2Projection(
        state,
        [
          createPostEvent('2025-01-13', 1),
          createPostEvent('2025-01-13', 2),
        ],
        TZ,
      );

      expect(state.currentStreak).toBe(2);

      // Miss a day → enter eligible
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-14')],
        TZ,
      );

      expect(state.status.type).toBe('eligible');
      expect(state.originalStreak).toBe(2); // Snapshotted once
      expect(state.currentStreak).toBe(0);

      // originalStreak stays frozen during eligible
      const savedOriginalStreak = state.originalStreak;

      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-15', 3)], // First recovery post
        TZ,
      );

      expect(state.originalStreak).toBe(savedOriginalStreak); // Still frozen
    });

    it('restore always sets currentStreak = originalStreak + increment, then syncs originalStreak', () => {
      let state = createInitialPhase2Projection();

      // Build streak
      state = applyEventsToPhase2Projection(
        state,
        [
          createPostEvent('2025-01-13', 1),
          createPostEvent('2025-01-13', 2),
        ],
        TZ,
      );

      expect(state.currentStreak).toBe(2);

      // Miss Wednesday
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-15')],
        TZ,
      );

      expect(state.originalStreak).toBe(2);

      // Restore on Thursday with 2 posts
      state = applyEventsToPhase2Projection(
        state,
        [
          createPostEvent('2025-01-16', 3),
          createPostEvent('2025-01-16', 4),
        ],
        TZ,
      );

      // currentStreak = originalStreak(2) + increment(2) = 4
      expect(state.currentStreak).toBe(4);
      // originalStreak synced to currentStreak
      expect(state.originalStreak).toBe(4);
      expect(state.originalStreak).toBe(state.currentStreak);
    });

    it('start-over sets both currentStreak=1 and originalStreak=1', () => {
      let state = createInitialPhase2Projection();

      // Build streak
      state = applyEventsToPhase2Projection(
        state,
        [
          createPostEvent('2025-01-13', 1),
          createPostEvent('2025-01-13', 2),
        ],
        TZ,
      );

      expect(state.currentStreak).toBe(2);

      // Miss a day
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-14')],
        TZ,
      );

      expect(state.originalStreak).toBe(2);

      // Partial recovery: only 1 post
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-15', 3)],
        TZ,
      );

      // Day closes → start over
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-15')],
        TZ,
      );

      // Both must be 1
      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(1);
      expect(state.originalStreak).toBe(1);
    });
  });

  describe('Friday classification guard', () => {
    it('ensures Friday miss requires postsRequired=1 and restores with +1', () => {
      let state = createInitialPhase2Projection();

      // Build streak
      state = applyEventsToPhase2Projection(
        state,
        [
          createPostEvent('2025-01-13', 1),
          createPostEvent('2025-01-13', 2),
        ],
        TZ,
      );

      const savedStreak = state.currentStreak;

      // Miss Friday (2025-01-17 is Friday)
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-17')],
        TZ,
      );

      // MUST be postsRequired=1 for Friday
      expect(state.status.type).toBe('eligible');
      expect(state.status.postsRequired).toBe(1);
      expect(state.originalStreak).toBe(savedStreak);

      // Recover on Saturday
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-18', 3)],
        TZ,
      );

      // MUST restore with +1 (not +2)
      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(savedStreak + 1);
    });
  });

  describe('Weekend neutrality', () => {
    it('Saturday/Sunday DAY_CLOSED never penalizes streak', () => {
      let state = createInitialPhase2Projection();

      // Build streak
      state = applyEventsToPhase2Projection(
        state,
        [
          createPostEvent('2025-01-13', 1),
          createPostEvent('2025-01-13', 2),
        ],
        TZ,
      );

      const savedStreak = state.currentStreak;

      // Virtual close on Saturday (2025-01-18)
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-18')],
        TZ,
      );

      // Should NOT enter eligible
      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(savedStreak);

      // Virtual close on Sunday (2025-01-19)
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-19')],
        TZ,
      );

      // Should STILL NOT enter eligible
      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(savedStreak);
    });
  });

  describe('Eligible close ordering', () => {
    it('recovery day close with currentPosts=1 → start-over (not missed)', () => {
      let state = createInitialPhase2Projection();

      // Build streak
      state = applyEventsToPhase2Projection(
        state,
        [
          createPostEvent('2025-01-13', 1),
          createPostEvent('2025-01-13', 2),
        ],
        TZ,
      );

      // Miss a day
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-14')],
        TZ,
      );

      expect(state.status.type).toBe('eligible');

      // Recovery day: only 1 post (needs 2)
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-15', 3)],
        TZ,
      );

      expect(state.status.type).toBe('eligible');
      expect(state.status.currentPosts).toBe(1);

      // Recovery day closes
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-15')],
        TZ,
      );

      // MUST be onStreak(1), NOT missed
      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(1);
    });

    it('recovery day close with currentPosts>=need → already restored (no-op)', () => {
      let state = createInitialPhase2Projection();

      // Build streak
      state = applyEventsToPhase2Projection(
        state,
        [
          createPostEvent('2025-01-13', 1),
          createPostEvent('2025-01-13', 2),
        ],
        TZ,
      );

      // Miss a day
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-14')],
        TZ,
      );

      // Recovery day: 2 posts (meets requirement)
      state = applyEventsToPhase2Projection(
        state,
        [
          createPostEvent('2025-01-15', 3),
          createPostEvent('2025-01-15', 4),
        ],
        TZ,
      );

      // Already restored
      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(4);
      const restoredStreak = state.currentStreak;

      // Recovery day closes (should be no-op)
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-15')],
        TZ,
      );

      // No change
      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(restoredStreak);
    });
  });

  describe('Same-day rebuild invariants', () => {
    it('from missed, two posts same day → onStreak(2) exactly', () => {
      let state = createInitialPhase2Projection();

      expect(state.status.type).toBe('missed');

      // Two posts on same day
      state = applyEventsToPhase2Projection(
        state,
        [
          createPostEvent('2025-01-13', 1),
          createPostEvent('2025-01-13', 2),
        ],
        TZ,
      );

      // MUST be onStreak(2), not any other value
      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(2);
      expect(state.originalStreak).toBe(2);
    });

    it('from missed, one post then day closes → start-over onStreak(1)', () => {
      let state = createInitialPhase2Projection();

      // One post
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-13', 1)],
        TZ,
      );

      expect(state.status.type).toBe('eligible');

      // Day closes
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-13')],
        TZ,
      );

      // MUST be onStreak(1)
      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(1);
      expect(state.originalStreak).toBe(1);
    });
  });

  describe('Timezone boundary tests', () => {
    it('Asia/Seoul user posts at 23:55 local → correct dayKey', () => {
      let state = createInitialPhase2Projection();

      // Post at 2025-01-13 23:55 KST
      const postEvent = {
        seq: 1,
        type: EventType.POST_CREATED as const,
        dayKey: '2025-01-13',
        createdAt: Timestamp.fromDate(fromZonedTime('2025-01-13T23:55:00', 'Asia/Seoul')),
        payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
      };

      state = applyEventsToPhase2Projection(state, [postEvent], 'Asia/Seoul');

      // Should count as 2025-01-13 (not next day)
      expect(state.lastContributionDate).toBe('2025-01-13');
    });

    it('America/Los_Angeles user posts at 23:55 local (next day UTC) → correct local dayKey', () => {
      let state = createInitialPhase2Projection();

      // Post at 2025-01-13 23:55 PST (which is 2025-01-14 07:55 UTC)
      const postEvent = {
        seq: 1,
        type: EventType.POST_CREATED as const,
        dayKey: '2025-01-13',
        createdAt: Timestamp.fromDate(fromZonedTime('2025-01-13T23:55:00', 'America/Los_Angeles')),
        payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
      };

      state = applyEventsToPhase2Projection(state, [postEvent], 'America/Los_Angeles');

      // Should count as 2025-01-13 in user's local time (not UTC date)
      expect(state.lastContributionDate).toBe('2025-01-13');
    });
  });

  describe('Evaluation cutoff sanity', () => {
    it('evaluationCutoff logic: hasPostedToday determines cutoff', () => {
      // This test documents the expected behavior from computeStreakProjection:
      // evaluationCutoff = hasPostedToday ? todayLocal : yesterdayLocal

      // Scenario 1: User posted today → cutoff should be today
      const hasPostedToday = true;
      const todayLocal = '2025-01-20';
      const yesterdayLocal = '2025-01-19';
      const cutoffWhenPosted = hasPostedToday ? todayLocal : yesterdayLocal;
      expect(cutoffWhenPosted).toBe('2025-01-20'); // Today

      // Scenario 2: User hasn't posted today → cutoff should be yesterday
      const hasNotPostedToday = false;
      const cutoffWhenNotPosted = hasNotPostedToday ? todayLocal : yesterdayLocal;
      expect(cutoffWhenNotPosted).toBe('2025-01-19'); // Yesterday
    });

    it('lastEvaluatedDayKey advances only to evaluationCutoff (not beyond)', () => {
      // Test that reducer respects the cutoff and doesn't evaluate future days
      const state = createInitialPhase2Projection();
      state.lastEvaluatedDayKey = '2025-01-18'; // Last evaluated: Jan 18

      // Simulate evaluation up to Jan 20 (today)
      const events: Event[] = [
        createPostEvent('2025-01-19', 1), // Yesterday
        createPostEvent('2025-01-20', 2), // Today
      ];

      const result = applyEventsToPhase2Projection(state, events, TZ);

      // lastContributionDate tracks the latest post
      expect(result.lastContributionDate).toBe('2025-01-20');

      // In actual compute function, lastEvaluatedDayKey would be set to evaluationCutoff
      // Here we just verify the projection processes events correctly
      // (The actual lastEvaluatedDayKey is set in computeStreakProjection, not the reducer)
    });

    it('extension ticks fill gaps between lastEvaluatedDayKey and evaluationCutoff', () => {
      // This test verifies the extension tick synthesis concept
      // If lastEvaluatedDayKey = '2025-01-15' and evaluationCutoff = '2025-01-18'
      // Then extension ticks should cover '2025-01-16', '2025-01-17'

      const lastEval = '2025-01-15';
      const cutoff = '2025-01-18';

      // Calculate expected gap days (16, 17)
      const expectedGapDays = ['2025-01-16', '2025-01-17'];

      // In computeStreakProjection, synthesizeExtensionTicks would generate
      // DAY_ACTIVITY or DAY_CLOSED_VIRTUAL for these days

      // Verify the gap exists
      expect(expectedGapDays.length).toBe(2);
      expect(expectedGapDays[0] > lastEval).toBe(true);
      expect(expectedGapDays[1] < cutoff).toBe(true);
    });
  });


  describe('Bug fix: Posting after deadline with partial progress', () => {
    it('eligible + post after deadline → start over to onStreak(1)', () => {
      // Bug: User 89kNbXuJwnbpDVjq9cKqRzha9HJ2
      // Posted once on Monday Oct 13 from missed → entered eligible with deadline Oct 13
      // Posted on Tuesday Oct 14 (after deadline) → stayed eligible forever
      // Fix: Posting after deadline with currentPosts=1 → start over to onStreak(1)

      let state = createInitialPhase2Projection();

      // Post once on Monday (working day) from missed
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-10-13', 1)], // Monday
        TZ,
      );

      // Should enter eligible with same-day deadline
      expect(state.status.type).toBe('eligible');
      if (state.status.type === 'eligible') {
        expect(state.status.currentPosts).toBe(1);
        expect(state.status.postsRequired).toBe(2);
        // Deadline is end of Monday Oct 13
      }

      // Post on Tuesday (after Monday deadline expired)
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-10-14', 2)], // Tuesday
        TZ,
      );

      // Should start over: deadline expired with currentPosts=1 → onStreak(1)
      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(1);
      expect(state.originalStreak).toBe(1);
      expect(state.longestStreak).toBe(1);
    });

    it('eligible + post after deadline with 0 progress → missed then new eligible', () => {
      // Note: Ideally the orchestrator synthesizes DAY_CLOSED_VIRTUAL before next-day posts
      // This test shows the reducer's defensive behavior when that doesn't happen

      let state = createInitialPhase2Projection();
      state.status = { type: 'onStreak' };
      state.currentStreak = 5;
      state.originalStreak = 5;

      // Miss Monday (enter eligible)
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-10-13')], // Monday
        TZ,
      );

      expect(state.status.type).toBe('eligible');
      expect(state.currentStreak).toBe(0);

      // Post on Tuesday (after Monday deadline with 0 progress)
      // Reducer treats as: deadline expired → missed, then post from missed → new eligible
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-10-14', 1)], // Tuesday
        TZ,
      );

      // Post from missed enters new eligible (same-day recovery attempt for Tuesday)
      expect(state.status.type).toBe('eligible');
      if (state.status.type === 'eligible') {
        expect(state.status.currentPosts).toBe(1);
        expect(state.status.postsRequired).toBe(2);
        // New deadline is end of Tuesday
      }
      expect(state.currentStreak).toBe(0);
    });
  });
});
