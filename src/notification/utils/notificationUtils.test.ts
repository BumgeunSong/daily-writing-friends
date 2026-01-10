import { Timestamp } from 'firebase/firestore';
import { describe, it, expect } from 'vitest';
import { NotificationType } from '@/notification/model/Notification';
import {
  createNotificationQueryKey,
  flattenNotificationPages,
  shouldFetchNextPage,
  getLastNotificationTimestamp,
} from './notificationUtils';
import type { Notification } from '@/notification/model/Notification';

function createMockNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notification-1',
    type: NotificationType.COMMENT_ON_POST,
    boardId: 'board-1',
    postId: 'post-1',
    fromUserId: 'user-1',
    message: 'Test notification',
    timestamp: Timestamp.fromDate(new Date('2025-01-15T12:00:00Z')),
    read: false,
    ...overrides,
  };
}

describe('notificationUtils', () => {
  describe('createNotificationQueryKey', () => {
    it('should create query key with userId', () => {
      const result = createNotificationQueryKey('user-123');
      expect(result).toEqual(['notifications', 'user-123']);
    });

    it('should create query key with null userId', () => {
      const result = createNotificationQueryKey(null);
      expect(result).toEqual(['notifications', null]);
    });

    it('should return readonly tuple', () => {
      const result = createNotificationQueryKey('user-123');
      // TypeScript would catch modifications, but we can test the values
      expect(result[0]).toBe('notifications');
      expect(result[1]).toBe('user-123');
    });
  });

  describe('flattenNotificationPages', () => {
    it('should flatten multiple pages into single array', () => {
      const pages = [
        [createMockNotification({ id: '1' }), createMockNotification({ id: '2' })],
        [createMockNotification({ id: '3' }), createMockNotification({ id: '4' })],
      ];

      const result = flattenNotificationPages(pages);

      expect(result).toHaveLength(4);
      expect(result.map((n) => n.id)).toEqual(['1', '2', '3', '4']);
    });

    it('should return empty array for undefined pages', () => {
      const result = flattenNotificationPages(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array for empty pages array', () => {
      const result = flattenNotificationPages([]);
      expect(result).toEqual([]);
    });

    it('should handle single page', () => {
      const pages = [[createMockNotification({ id: '1' }), createMockNotification({ id: '2' })]];

      const result = flattenNotificationPages(pages);

      expect(result).toHaveLength(2);
    });

    it('should handle pages with different lengths', () => {
      const pages = [
        [createMockNotification({ id: '1' })],
        [
          createMockNotification({ id: '2' }),
          createMockNotification({ id: '3' }),
          createMockNotification({ id: '4' }),
        ],
        [createMockNotification({ id: '5' }), createMockNotification({ id: '6' })],
      ];

      const result = flattenNotificationPages(pages);

      expect(result).toHaveLength(6);
    });

    it('should handle empty pages in between', () => {
      const pages = [
        [createMockNotification({ id: '1' })],
        [],
        [createMockNotification({ id: '2' })],
      ];

      const result = flattenNotificationPages(pages);

      expect(result).toHaveLength(2);
      expect(result.map((n) => n.id)).toEqual(['1', '2']);
    });

    it('should preserve notification properties', () => {
      const notification = createMockNotification({
        id: 'test-id',
        type: NotificationType.REPLY_ON_COMMENT,
        message: 'Test message',
        read: true,
      });
      const pages = [[notification]];

      const result = flattenNotificationPages(pages);

      expect(result[0]).toEqual(notification);
    });
  });

  describe('shouldFetchNextPage', () => {
    it('should return true when in view and has next page', () => {
      expect(shouldFetchNextPage(true, true)).toBe(true);
    });

    it('should return false when not in view', () => {
      expect(shouldFetchNextPage(false, true)).toBe(false);
    });

    it('should return false when no next page', () => {
      expect(shouldFetchNextPage(true, false)).toBe(false);
    });

    it('should return false when not in view and no next page', () => {
      expect(shouldFetchNextPage(false, false)).toBe(false);
    });

    it('should return false when hasNextPage is undefined', () => {
      expect(shouldFetchNextPage(true, undefined)).toBe(false);
    });

    it('should return false when both are falsy', () => {
      expect(shouldFetchNextPage(false, undefined)).toBe(false);
    });
  });

  describe('getLastNotificationTimestamp', () => {
    it('should return timestamp of last notification', () => {
      const timestamp = Timestamp.fromDate(new Date('2025-01-15T12:00:00Z'));
      const notifications = [
        createMockNotification({ id: '1', timestamp: Timestamp.fromDate(new Date('2025-01-14')) }),
        createMockNotification({ id: '2', timestamp }),
      ];

      const result = getLastNotificationTimestamp(notifications);

      expect(result).toBe(timestamp);
    });

    it('should return undefined for empty array', () => {
      const result = getLastNotificationTimestamp([]);
      expect(result).toBeUndefined();
    });

    it('should return timestamp of single notification', () => {
      const timestamp = Timestamp.fromDate(new Date('2025-01-15T12:00:00Z'));
      const notifications = [createMockNotification({ timestamp })];

      const result = getLastNotificationTimestamp(notifications);

      expect(result).toBe(timestamp);
    });

    it('should return last notification timestamp regardless of date order', () => {
      // The function returns the timestamp of the last item in array, not the oldest/newest
      const olderTimestamp = Timestamp.fromDate(new Date('2025-01-10'));
      const newerTimestamp = Timestamp.fromDate(new Date('2025-01-15'));

      const notifications = [
        createMockNotification({ id: '1', timestamp: newerTimestamp }),
        createMockNotification({ id: '2', timestamp: olderTimestamp }), // Last in array
      ];

      const result = getLastNotificationTimestamp(notifications);

      expect(result).toBe(olderTimestamp); // Returns last in array, not newest
    });
  });
});
