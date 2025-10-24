import { describe, it, expect } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import { fromZonedTime } from 'date-fns-tz';
import { Event, EventType } from '../../types/Event';
import {
  applyEventsToPhase2Projection,
  createInitialPhase2Projection,
} from '../streakReducerPhase2';

const TZ = 'Asia/Seoul';

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
