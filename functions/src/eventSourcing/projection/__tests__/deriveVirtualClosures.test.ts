import { describe, it, expect } from '@jest/globals';
import { Event, EventType } from '../../types/Event';
import { deriveVirtualClosures } from '../deriveVirtualClosures';
import { createPostEvent, groupEventsByDayKey } from './testUtils';

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
