import { describe, it, expect } from '@jest/globals';
import { Timestamp } from 'firebase-admin/firestore';
import {
  applyEventsToPhase2Projection,
  createInitialPhase2Projection,
} from '../streakReducerPhase2';
import { Event, EventType } from '../../types/Event';
import { getEndOfDay } from '../../utils/workingDayUtils';

/**
 * Tests for phase2.1-no-crossday-v1 rules:
 * - No cross-day rebuild
 * - Same-day recovery only
 * - Start over with 1 post after partial recovery
 */

const TIMEZONE = 'Asia/Seoul';

function createPostEvent(dayKey: string, seq: number): Event {
  return {
    seq,
    type: EventType.POST_CREATED,
    dayKey,
    createdAt: getEndOfDay(dayKey, TIMEZONE),
    payload: { postId: `post-${seq}`, boardId: 'board1', contentLength: 100 },
  };
}

function createDayActivityEvent(dayKey: string, postsCount: number): Event {
  return {
    seq: 0,
    type: EventType.DAY_ACTIVITY,
    dayKey,
    createdAt: getEndOfDay(dayKey, TIMEZONE),
    payload: { postsCount },
  };
}

function createDayClosedVirtualEvent(dayKey: string): Event {
  return {
    seq: 0,
    type: EventType.DAY_CLOSED_VIRTUAL,
    dayKey,
    createdAt: Timestamp.fromMillis(getEndOfDay(dayKey, TIMEZONE).toMillis() + 1),
  };
}

describe('No Cross-Day Rebuild Rules', () => {
  describe('Weekday miss with full recovery', () => {
    it('restores streak with +2 when 2+ posts on recovery day', () => {
      let state = createInitialPhase2Projection();

      // Build streak with 2 posts same day
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-13', 1), createPostEvent('2025-01-13', 2)], // Mon, 2 posts
        TIMEZONE,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(2);

      // Continue posting (no increment)
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-14', 3)], // Tue
        TIMEZONE,
      );

      expect(state.currentStreak).toBe(2); // No cross-day increment

      // Miss Wednesday
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-15')], // Wed - no posts
        TIMEZONE,
      );

      expect(state.status.type).toBe('eligible');
      expect(state.status.postsRequired).toBe(2); // Weekday miss requires 2 posts
      expect(state.originalStreak).toBe(2);

      // Recover on Thursday with 2 posts
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-16', 4), createPostEvent('2025-01-16', 5)], // Thu - 2 posts
        TIMEZONE,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(4); // originalStreak(2) + 2
    });
  });

  describe('Weekday miss with partial recovery', () => {
    it('starts over with streak=1 when only 1 post on recovery day', () => {
      let state = createInitialPhase2Projection();

      // Build streak using same-day 2 posts
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-13', 1), createPostEvent('2025-01-13', 2)], // Mon, 2 posts
        TIMEZONE,
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
        TIMEZONE,
      );

      expect(state.currentStreak).toBe(2); // Still 2 (no increment for separate days)

      // Miss Thursday
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-16')], // Thu - no posts
        TIMEZONE,
      );

      expect(state.status.type).toBe('eligible');
      expect(state.originalStreak).toBe(2);

      // Partial recovery: only 1 post on Friday (recovery day)
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-17', 5)], // Fri - 1 post
        TIMEZONE,
      );

      // Still eligible with currentPosts = 1
      expect(state.status.type).toBe('eligible');

      // Day closes with only 1 post → start over
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-17')], // Fri closes
        TIMEZONE,
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
        TIMEZONE,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(2);

      // Post Thursday (jump to Thu to avoid confusion)
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-16', 3)], // Thu
        TIMEZONE,
      );

      expect(state.currentStreak).toBe(2); // Should NOT increment
      expect(state.originalStreak).toBe(2); // Should NOT change

      // Miss Friday
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-17')], // Fri - no posts
        TIMEZONE,
      );

      expect(state.status.type).toBe('eligible');
      expect(state.status.postsRequired).toBe(1); // Friday miss requires only 1 post
      expect(state.originalStreak).toBe(2); // Should have saved streak = 2

      // Recover on Saturday
      state = applyEventsToPhase2Projection(
        state,
        [createPostEvent('2025-01-18', 6)], // Sat - 1 post
        TIMEZONE,
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
      state = applyEventsToPhase2Projection(state, [createPostEvent('2025-01-13', 1)], TIMEZONE);

      expect(state.status.type).toBe('eligible');
      expect(state.status.postsRequired).toBe(2);

      // Second post same day: rebuild with streak=2
      state = applyEventsToPhase2Projection(state, [createPostEvent('2025-01-13', 2)], TIMEZONE);

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(2);
    });
  });

  describe('From missed: start over', () => {
    it('starts with streak=1 when day closes with only 1 post', () => {
      let state = createInitialPhase2Projection();

      // One post on Monday
      state = applyEventsToPhase2Projection(state, [createPostEvent('2025-01-13', 1)], TIMEZONE);

      expect(state.status.type).toBe('eligible');

      // Day closes
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-13')],
        TIMEZONE,
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
        TIMEZONE,
      );

      expect(state.currentStreak).toBe(2);

      // Miss a day
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-14')],
        TIMEZONE,
      );

      expect(state.status.type).toBe('eligible');

      // Extension window: Wednesday had 2 posts (simulated via DAY_ACTIVITY)
      state = applyEventsToPhase2Projection(
        state,
        [createDayActivityEvent('2025-01-15', 2)], // Wed - 2 posts
        TIMEZONE,
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
        TIMEZONE,
      );

      // Miss a day
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-14')],
        TIMEZONE,
      );

      expect(state.status.type).toBe('eligible');

      // Extension: Wednesday had only 1 post
      state = applyEventsToPhase2Projection(
        state,
        [createDayActivityEvent('2025-01-15', 1)], // Wed - 1 post
        TIMEZONE,
      );

      // Still eligible (needs day close)
      expect(state.status.type).toBe('eligible');

      // Day closes
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-15')],
        TIMEZONE,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(1); // Start over
    });
  });

  describe('No cross-day rebuild', () => {
    it('does NOT rebuild with posts on separate days', () => {
      let state = createInitialPhase2Projection();

      // Post on Monday
      state = applyEventsToPhase2Projection(state, [createPostEvent('2025-01-13', 1)], TIMEZONE);

      expect(state.status.type).toBe('eligible'); // First post from missed

      // Day closes with 1 post
      state = applyEventsToPhase2Projection(
        state,
        [createDayClosedVirtualEvent('2025-01-13')],
        TIMEZONE,
      );

      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(1);

      // Post on Wednesday (separate day) - should NOT increment streak
      state = applyEventsToPhase2Projection(state, [createPostEvent('2025-01-15', 2)], TIMEZONE);

      // Still onStreak but currentStreak doesn't increase
      expect(state.status.type).toBe('onStreak');
      expect(state.currentStreak).toBe(1); // NOT 2!
    });
  });
});
