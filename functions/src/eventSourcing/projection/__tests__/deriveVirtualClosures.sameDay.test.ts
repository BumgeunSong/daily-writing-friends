import { describe, it, expect } from '@jest/globals';
import { Event } from '../../types/Event';
import { deriveVirtualClosures } from '../deriveVirtualClosures';
import { createPostEvent, groupEventsByDayKey } from './testUtils';

const TZ = 'Asia/Seoul';

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
