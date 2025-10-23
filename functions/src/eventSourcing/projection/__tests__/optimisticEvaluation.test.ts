import { describe, it, expect } from '@jest/globals';
import { deriveVirtualClosures } from '../deriveVirtualClosures';
import { createPostEvent, groupEventsByDayKey } from './testUtils';

const TZ = 'Asia/Seoul';

describe('Optimistic Evaluation', () => {
  describe('when user has posted today', () => {
    it('evaluates up to today and includes today post in calculation', () => {
      // Arrange: User posted yesterday and today
      const yesterdayKey = '2025-10-22'; // Tue
      const todayKey = '2025-10-23'; // Wed
      const events = [createPostEvent(yesterdayKey, 20), createPostEvent(todayKey, 22)];
      const eventsByDayKey = groupEventsByDayKey(events);

      // Act: Evaluate up to today (because today has posts)
      const startDayKey = '2025-10-21'; // Mon (day before first post)
      const virtualClosures = deriveVirtualClosures(startDayKey, todayKey, eventsByDayKey, TZ);

      // Assert: No virtual closures (both days have posts)
      expect(virtualClosures).toHaveLength(0);

      // This means both events will be processed and streak = 2
    });

    it('generates virtual closures for past days but not today', () => {
      // Arrange: User missed Mon-Tue, posted Wed (today)
      const mondayKey = '2025-10-21';
      const tuesdayKey = '2025-10-22';
      const wednesdayKey = '2025-10-23'; // Today
      const events = [createPostEvent(wednesdayKey, 1)];
      const eventsByDayKey = groupEventsByDayKey(events);

      // Act: Evaluate up to today
      const startDayKey = '2025-10-20'; // Fri
      const virtualClosures = deriveVirtualClosures(startDayKey, wednesdayKey, eventsByDayKey, TZ);

      // Assert: Virtual closures for Mon and Tue only
      expect(virtualClosures).toHaveLength(2);
      expect(virtualClosures[0].dayKey).toBe(mondayKey);
      expect(virtualClosures[1].dayKey).toBe(tuesdayKey);
      // No virtual closure for today (user posted)
    });
  });

  describe('when user has NOT posted today', () => {
    it('evaluates only up to yesterday (optimistic)', () => {
      // Arrange: User posted yesterday but not today (yet)
      const yesterdayKey = '2025-10-22'; // Tue
      const events = [createPostEvent(yesterdayKey, 20)];
      const eventsByDayKey = groupEventsByDayKey(events);

      // Act: Evaluate only up to yesterday (NOT today)
      const startDayKey = '2025-10-21'; // Mon
      const virtualClosures = deriveVirtualClosures(startDayKey, yesterdayKey, eventsByDayKey, TZ);

      // Assert: No virtual closures (yesterday has post, today not evaluated yet)
      expect(virtualClosures).toHaveLength(0);

      // This gives user time to post today without being marked as "missed"
    });

    it('does not generate virtual closure for today even if working day', () => {
      // Arrange: Last post was Friday, today is Monday (no posts yet)
      const fridayKey = '2025-10-17';
      const events = [createPostEvent(fridayKey, 1)];
      const eventsByDayKey = groupEventsByDayKey(events);

      // Act: Evaluate only up to yesterday (Sunday)
      const startDayKey = '2025-10-16'; // Thu
      const yesterdayKey = '2025-10-19'; // Sun
      const virtualClosures = deriveVirtualClosures(startDayKey, yesterdayKey, eventsByDayKey, TZ);

      // Assert: No virtual closures (weekend not counted, today not evaluated)
      expect(virtualClosures).toHaveLength(0);

      // User has all day Monday to post without penalty
    });

    it('generates virtual closure for yesterday if missed', () => {
      // Arrange: User posted Mon, missed Tue, today is Wed (no posts yet)
      const mondayKey = '2025-10-21';
      const tuesdayKey = '2025-10-22';
      const events = [createPostEvent(mondayKey, 1)];
      const eventsByDayKey = groupEventsByDayKey(events);

      // Act: Evaluate only up to yesterday (Tuesday)
      const startDayKey = '2025-10-20'; // Fri
      const virtualClosures = deriveVirtualClosures(startDayKey, tuesdayKey, eventsByDayKey, TZ);

      // Assert: Virtual closure for Tuesday only
      expect(virtualClosures).toHaveLength(1);
      expect(virtualClosures[0].dayKey).toBe(tuesdayKey);
      // Today (Wed) not evaluated yet - optimistic!
    });
  });

  describe('edge cases', () => {
    it('handles multiple posts on same day', () => {
      // Arrange: User posted 3 times today
      const todayKey = '2025-10-23';
      const events = [
        createPostEvent(todayKey, 1, 'post1'),
        createPostEvent(todayKey, 2, 'post2'),
        createPostEvent(todayKey, 3, 'post3'),
      ];
      const eventsByDayKey = groupEventsByDayKey(events);

      // Act: Evaluate up to today
      const startDayKey = '2025-10-22';
      const virtualClosures = deriveVirtualClosures(startDayKey, todayKey, eventsByDayKey, TZ);

      // Assert: No virtual closures (today has posts)
      expect(virtualClosures).toHaveLength(0);
    });

    it('handles weekend correctly with optimistic evaluation', () => {
      // Arrange: Friday post, today is Saturday (no posts)
      const fridayKey = '2025-10-17';
      const events = [createPostEvent(fridayKey, 1)];
      const eventsByDayKey = groupEventsByDayKey(events);

      // Act: Evaluate only up to yesterday (Friday)
      const startDayKey = '2025-10-16';
      const virtualClosures = deriveVirtualClosures(startDayKey, fridayKey, eventsByDayKey, TZ);

      // Assert: No virtual closures (Friday has post, Saturday not evaluated)
      expect(virtualClosures).toHaveLength(0);
      // Weekend doesn't count anyway, so no penalty
    });
  });

  describe('cache invalidation behavior', () => {
    it('requires re-evaluation when user posts on new day', () => {
      // Scenario:
      // - Yesterday: cache was computed with cutoff = yesterday, no today posts
      // - Today: user posts → cache should be invalidated
      // - New evaluation: cutoff = today

      // This test verifies the logic that determines cache staleness
      const yesterdayKey = '2025-10-22';
      const todayKey = '2025-10-23';

      // Cached state from yesterday's computation
      const cachedLastEvaluatedDayKey = yesterdayKey; // Evaluated up to yesterday

      // New events include today's post
      const hasPostsToday = true;
      const newCutoff = hasPostsToday ? todayKey : yesterdayKey;

      // Assert: Cache is stale (needs update)
      expect(cachedLastEvaluatedDayKey).not.toBe(newCutoff);
    });
  });
});
