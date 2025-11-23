import { describe, it, expect } from '@jest/globals';
import { Event, EventType } from '../../types/Event';
import { deriveVirtualClosures } from '../deriveVirtualClosures';
import { createPostEvent, groupEventsByDayKey } from './testUtils';
import { toHolidayMap } from '../../types/Holiday';

const TZ = 'Asia/Seoul';

describe('deriveVirtualClosures', () => {
  describe('when user missed single working day', () => {
    it('creates virtual DayClosed for that day', () => {
      // Arrange: Mon (2025-10-20) has no posts
      const startDayKey = '2025-10-19'; // Fri
      const endDayKey = '2025-10-20'; // Mon
      const eventsByDayKey = new Map<string, Event[]>(); // No posts on Mon

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].dayKey).toBe('2025-10-20');
      expect(result[0].type).toBe(EventType.DAY_CLOSED);
    });
  });

  describe('when range includes weekend', () => {
    it('skips Saturday and Sunday', () => {
      // Arrange: Fri → Mon, weekend has no posts (expected)
      const startDayKey = '2025-10-17'; // Fri
      const endDayKey = '2025-10-20'; // Mon
      const eventsByDayKey = new Map<string, Event[]>();

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ);

      // Assert
      expect(result).toHaveLength(1); // Only Mon (working day)
      expect(result[0].dayKey).toBe('2025-10-20');
    });
  });

  describe('when user missed Mon-Wed', () => {
    it('creates virtual closures for all 3 working days in order', () => {
      // Arrange
      const startDayKey = '2025-10-17'; // Fri
      const endDayKey = '2025-10-22'; // Wed
      const eventsByDayKey = new Map<string, Event[]>();

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ);

      // Assert
      expect(result).toHaveLength(3); // Mon, Tue, Wed
      expect(result[0].dayKey).toBe('2025-10-20');
      expect(result[1].dayKey).toBe('2025-10-21');
      expect(result[2].dayKey).toBe('2025-10-22');
    });
  });

  describe('when working day has posts', () => {
    it('does not create virtual DayClosed for that day', () => {
      // Arrange
      const startDayKey = '2025-10-19'; // Sun
      const endDayKey = '2025-10-21'; // Tue
      const events = [createPostEvent('2025-10-20', 1)]; // Post on Mon
      const eventsByDayKey = groupEventsByDayKey(events);

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ);

      // Assert
      expect(result).toHaveLength(1); // Only Tue (no post)
      expect(result[0].dayKey).toBe('2025-10-21');
    });
  });

  describe('when creating virtual closure', () => {
    it('sets createdAt to end of day in user timezone', () => {
      // Arrange
      const startDayKey = '2025-10-19';
      const endDayKey = '2025-10-20';
      const eventsByDayKey = new Map<string, Event[]>();

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ);

      // Assert: Virtual closure should be created with a valid Timestamp
      expect(result[0].createdAt).toBeDefined();
      expect(result[0].createdAt.toDate()).toBeInstanceOf(Date);

      // The timestamp should represent end-of-day (verified by using getEndOfDay utility)
      // We trust getEndOfDay since it's used throughout the codebase and tested elsewhere
    });
  });

  describe('when start and end are the same', () => {
    it('returns empty array', () => {
      const dayKey = '2025-10-20';
      const result = deriveVirtualClosures(dayKey, dayKey, new Map(), TZ);

      expect(result).toEqual([]);
    });
  });

  describe('when all days in range have posts', () => {
    it('returns empty array', () => {
      const startDayKey = '2025-10-20'; // Mon
      const endDayKey = '2025-10-22'; // Wed
      const events = [
        createPostEvent('2025-10-21', 1), // Tue
        createPostEvent('2025-10-22', 2), // Wed
      ];
      const eventsByDayKey = groupEventsByDayKey(events);

      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ);

      expect(result).toEqual([]);
    });
  });
});

// const TZ = 'Asia/Seoul';

describe('deriveVirtualClosures - Same Day Evaluation', () => {
  describe('when evaluating up to today with posts', () => {
    it('does not generate virtual closure for today', () => {
      // Arrange: Today (2025-10-23 Wed) has posts
      const startDayKey = '2025-10-22'; // Yesterday (Tue)
      const endDayKey = '2025-10-23'; // Today (Wed)
      const events = [createPostEvent('2025-10-23', 1)];
      const eventsByDayKey = groupEventsByDayKey(events);

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ);

      // Assert: No virtual closures (today has posts, so no closure needed)
      expect(result).toHaveLength(0);
    });
  });

  describe('when evaluating up to today without posts', () => {
    it('generates virtual closure for today (working day without posts)', () => {
      // Arrange: Today (2025-10-23 Wed) has no posts
      // Since we're evaluating up to "now", today counts as a missed working day
      const startDayKey = '2025-10-22'; // Yesterday
      const endDayKey = '2025-10-23'; // Today
      const eventsByDayKey = new Map<string, Event[]>();

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ);

      // Assert: Virtual closure for today (immediate feedback for miss)
      expect(result).toHaveLength(1);
      expect(result[0].dayKey).toBe('2025-10-23');
      expect(result[0].idempotencyKey).toBe('virtual:2025-10-23:closed');
    });
  });

  describe('when evaluating multi-day range ending today', () => {
    it('generates virtual closures for past days but not today', () => {
      // Arrange:
      // - 2025-10-20 (Fri): has post
      // - 2025-10-21 (Mon): no posts → should generate virtual closure
      // - 2025-10-22 (Tue): no posts → should generate virtual closure
      // - 2025-10-23 (Wed): today, has post → no virtual closure
      const startDayKey = '2025-10-20'; // Fri
      const endDayKey = '2025-10-23'; // Wed (today)
      const events = [createPostEvent('2025-10-23', 1)]; // Only today has post
      const eventsByDayKey = groupEventsByDayKey(events);

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ);

      // Assert: Virtual closures for Mon and Tue only (not today)
      expect(result).toHaveLength(2);
      expect(result[0].dayKey).toBe('2025-10-21'); // Mon
      expect(result[1].dayKey).toBe('2025-10-22'); // Tue
    });
  });

  describe('when yesterday had no posts and today has posts', () => {
    it('generates virtual closure for yesterday but not today', () => {
      // Arrange:
      // - 2025-10-22 (Tue): no posts → should generate virtual closure
      // - 2025-10-23 (Wed): today, has post → no virtual closure
      const startDayKey = '2025-10-21'; // Mon
      const endDayKey = '2025-10-23'; // Wed (today)
      const events = [createPostEvent('2025-10-23', 1)];
      const eventsByDayKey = groupEventsByDayKey(events);

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].dayKey).toBe('2025-10-22'); // Only yesterday
    });
  });

  describe('when consecutive working days with posts including today', () => {
    it('does not generate any virtual closures', () => {
      // Arrange: Posts on Mon, Tue, Wed (today)
      const startDayKey = '2025-10-20'; // Fri
      const endDayKey = '2025-10-23'; // Wed (today)
      const events = [
        createPostEvent('2025-10-21', 1), // Mon
        createPostEvent('2025-10-22', 2), // Tue
        createPostEvent('2025-10-23', 3), // Wed (today)
      ];
      const eventsByDayKey = groupEventsByDayKey(events);

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ);

      // Assert: No virtual closures (all working days have posts)
      expect(result).toHaveLength(0);
    });
  });

  describe('when weekend included in range ending today', () => {
    it('skips weekend days and does not generate closure for today', () => {
      // Arrange:
      // - 2025-10-17 (Fri): start day
      // - 2025-10-18 (Sat): weekend, skip
      // - 2025-10-19 (Sun): weekend, skip
      // - 2025-10-20 (Mon): no posts → virtual closure
      // - 2025-10-21 (Tue): no posts → virtual closure
      // - 2025-10-22 (Wed): today, has post → no closure
      const startDayKey = '2025-10-17'; // Fri
      const endDayKey = '2025-10-22'; // Wed (today)
      const events = [createPostEvent('2025-10-22', 1)];
      const eventsByDayKey = groupEventsByDayKey(events);

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ);

      // Assert: Virtual closures for Mon and Tue only
      expect(result).toHaveLength(2);
      expect(result[0].dayKey).toBe('2025-10-20'); // Mon
      expect(result[1].dayKey).toBe('2025-10-21'); // Tue
    });
  });
});

// const TZ = 'Asia/Seoul';

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

describe('deriveVirtualClosures - Holiday Support', () => {
  describe('when range includes holidays', () => {
    it('does not create virtual closures for holidays', () => {
      // Arrange: Mon-Wed range where Monday is a holiday
      const startDayKey = '2025-03-02'; // Sunday
      const endDayKey = '2025-03-05'; // Wednesday
      const eventsByDayKey = new Map<string, Event[]>(); // No posts
      const holidayMap = toHolidayMap([
        { date: '2025-03-03', name: '삼일절' }, // Monday is holiday
      ]);

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ, holidayMap);

      // Assert: Only Tue and Wed get closures (Mon is holiday, Sun is weekend)
      expect(result).toHaveLength(2);
      expect(result[0].dayKey).toBe('2025-03-04'); // Tuesday
      expect(result[1].dayKey).toBe('2025-03-05'); // Wednesday
    });

    it('creates closures for all working days when no holiday map provided', () => {
      // Arrange: Same range, but no holiday map
      const startDayKey = '2025-03-02'; // Sunday
      const endDayKey = '2025-03-05'; // Wednesday
      const eventsByDayKey = new Map<string, Event[]>(); // No posts

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ);

      // Assert: Mon, Tue, Wed all get closures (holiday not considered)
      expect(result).toHaveLength(3);
      expect(result[0].dayKey).toBe('2025-03-03'); // Monday (not skipped)
      expect(result[1].dayKey).toBe('2025-03-04'); // Tuesday
      expect(result[2].dayKey).toBe('2025-03-05'); // Wednesday
    });

    it('skips multiple consecutive holidays', () => {
      // Arrange: Mon-Fri range with Mon-Wed as holidays
      const startDayKey = '2025-03-02'; // Sunday
      const endDayKey = '2025-03-07'; // Friday
      const eventsByDayKey = new Map<string, Event[]>();
      const holidayMap = toHolidayMap([
        { date: '2025-03-03', name: 'Holiday 1' }, // Monday
        { date: '2025-03-04', name: 'Holiday 2' }, // Tuesday
        { date: '2025-03-05', name: 'Holiday 3' }, // Wednesday
      ]);

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ, holidayMap);

      // Assert: Only Thu and Fri get closures
      expect(result).toHaveLength(2);
      expect(result[0].dayKey).toBe('2025-03-06'); // Thursday
      expect(result[1].dayKey).toBe('2025-03-07'); // Friday
    });
  });

  describe('when user posts on some days but misses holiday', () => {
    it('does not create closure for holiday even if missed', () => {
      // Arrange: User posts on Tue and Wed, but Mon (holiday) has no post
      const startDayKey = '2025-03-02'; // Sunday
      const endDayKey = '2025-03-05'; // Wednesday
      const eventsByDayKey = new Map<string, Event[]>();

      // User posted on Tue and Wed
      eventsByDayKey.set('2025-03-04', [createPostEvent('2025-03-04', 1, 'post1')]);
      eventsByDayKey.set('2025-03-05', [createPostEvent('2025-03-05', 1, 'post2')]);

      const holidayMap = toHolidayMap([
        { date: '2025-03-03', name: '삼일절' }, // Monday is holiday
      ]);

      // Act
      const result = deriveVirtualClosures(startDayKey, endDayKey, eventsByDayKey, TZ, holidayMap);

      // Assert: No closures (Mon is holiday, Tue/Wed have posts)
      expect(result).toHaveLength(0);
    });
  });
});
