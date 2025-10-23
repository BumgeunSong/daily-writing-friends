import { describe, it, expect } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
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
      expect(state.projectorVersion).toBe('phase2-v2-consecutive');
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
        deadline: Timestamp.fromDate(new Date('2025-01-21T23:59:59Z')),
        missedDate: Timestamp.fromDate(new Date('2025-01-20T23:59:59Z')),
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
        deadline: Timestamp.fromDate(new Date('2025-01-18T14:59:59.999Z')), // End of Sat in Seoul (recovery day)
        missedDate: Timestamp.fromDate(new Date('2025-01-17T14:59:59.999Z')), // End of Fri in Seoul
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
    it('transitions to missed when deadline passes with partial progress', () => {
      const state = createInitialPhase2Projection();
      state.status = {
        type: 'eligible',
        postsRequired: 2,
        currentPosts: 1, // Already made 1 post during recovery window
        deadline: Timestamp.fromDate(new Date('2025-01-21T14:59:59.999Z')), // End of 2025-01-21 in Seoul
        missedDate: Timestamp.fromDate(new Date('2025-01-20T14:59:59.999Z')), // End of 2025-01-20 in Seoul
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

      expect(result.status.type).toBe('missed');
      expect(result.currentStreak).toBe(1); // Partial progress preserved
      expect(result.originalStreak).toBe(10); // Original preserved
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
      expect(result.currentStreak).toBe(6); // originalStreak=5 + restoredStreak=1
    });
  });

  describe('Missed rebuild - cross-day consecutive working days', () => {
    describe('when posts are on consecutive working days', () => {
      it('transitions to onStreak with streak of 2 (Mon-Tue)', () => {
        const state = createInitialPhase2Projection();
        state.status = { type: 'missed' };
        state.originalStreak = 3;
        state.currentStreak = 0;

        const events: Event[] = [
          {
            seq: 1,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2025-01-20', // Monday
            payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
          },
          {
            seq: 2,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2025-01-21', // Tuesday
            payload: { postId: 'p2', boardId: 'b1', contentLength: 150 },
          },
        ];

        const result = applyEventsToPhase2Projection(state, events, TZ);

        expect(result.status.type).toBe('onStreak');
        expect(result.currentStreak).toBe(5); // originalStreak=3 + restoredStreak=2
      });

      it('transitions to onStreak skipping weekend (Fri-Mon)', () => {
        const state = createInitialPhase2Projection();
        state.status = { type: 'missed' };
        state.originalStreak = 0;
        state.currentStreak = 0;

        const events: Event[] = [
          {
            seq: 1,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2025-01-17', // Friday
            payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
          },
          {
            seq: 2,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2025-01-20', // Monday (next working day after Friday)
            payload: { postId: 'p2', boardId: 'b1', contentLength: 150 },
          },
        ];

        const result = applyEventsToPhase2Projection(state, events, TZ);

        expect(result.status.type).toBe('onStreak');
        expect(result.currentStreak).toBe(2); // 2 consecutive working days
      });

      it('transitions to onStreak with initial 2 consecutive days', () => {
        const state = createInitialPhase2Projection();
        state.status = { type: 'missed' };
        state.originalStreak = 0;
        state.currentStreak = 0;

        const events: Event[] = [
          {
            seq: 1,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2025-01-13', // Monday
            payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
          },
          {
            seq: 2,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2025-01-14', // Tuesday
            payload: { postId: 'p2', boardId: 'b1', contentLength: 100 },
          },
        ];

        const result = applyEventsToPhase2Projection(state, events, TZ);

        expect(result.status.type).toBe('onStreak');
        expect(result.currentStreak).toBe(2); // Minimum streak from 2 consecutive days
      });
    });

    describe('when posts are NOT consecutive working days', () => {
      it('stays in missed status when skipping a working day (Mon, Wed)', () => {
        const state = createInitialPhase2Projection();
        state.status = { type: 'missed' };
        state.originalStreak = 5;
        state.currentStreak = 0;

        const events: Event[] = [
          {
            seq: 1,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2025-01-20', // Monday
            payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
          },
          {
            seq: 2,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2025-01-22', // Wednesday (skipped Tuesday)
            payload: { postId: 'p2', boardId: 'b1', contentLength: 150 },
          },
        ];

        const result = applyEventsToPhase2Projection(state, events, TZ);

        expect(result.status.type).toBe('missed');
        expect(result.currentStreak).toBe(0);
        expect(result.originalStreak).toBe(5);
      });

      it('stays in missed status with only one working day post', () => {
        const state = createInitialPhase2Projection();
        state.status = { type: 'missed' };
        state.originalStreak = 0;
        state.currentStreak = 0;

        const events: Event[] = [
          {
            seq: 1,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2025-01-20', // Monday only
            payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
          },
        ];

        const result = applyEventsToPhase2Projection(state, events, TZ);

        expect(result.status.type).toBe('missed');
        expect(result.currentStreak).toBe(0);
      });

      it('stays in missed when posts are far apart (Mon week 1, Mon week 2)', () => {
        const state = createInitialPhase2Projection();
        state.status = { type: 'missed' };
        state.originalStreak = 3;
        state.currentStreak = 0;

        const events: Event[] = [
          {
            seq: 1,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2025-01-13', // Monday week 1
            payload: { postId: 'p1', boardId: 'b1', contentLength: 100 },
          },
          {
            seq: 2,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2025-01-20', // Monday week 2 (not consecutive)
            payload: { postId: 'p2', boardId: 'b1', contentLength: 150 },
          },
        ];

        const result = applyEventsToPhase2Projection(state, events, TZ);

        expect(result.status.type).toBe('missed');
        expect(result.currentStreak).toBe(0);
      });
    });

    describe('when processing incremental events', () => {
      it('transitions to onStreak when second consecutive post arrives later', () => {
        // First event batch: posted on Monday
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

        expect(result1.status.type).toBe('missed');
        expect(result1.status.missedPostDates).toEqual(['2025-10-21']);
        expect(result1.currentStreak).toBe(0);

        // Second event batch: posted on Tuesday (next working day)
        const events2: Event[] = [
          {
            seq: 2,
            type: EventType.POST_CREATED,
            createdAt: Timestamp.now(),
            dayKey: '2025-10-22', // Tuesday (consecutive working day)
            payload: { postId: 'p2', boardId: 'b1', contentLength: 100 },
          },
        ];

        const result2 = applyEventsToPhase2Projection(result1, events2, TZ);

        expect(result2.status.type).toBe('onStreak');
        expect(result2.currentStreak).toBe(2); // 2 consecutive working days
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
