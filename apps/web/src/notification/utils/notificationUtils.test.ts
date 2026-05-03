import { createTimestamp } from '@/shared/model/Timestamp';
import { describe, it, expect, vi } from 'vitest';
import { NotificationType } from '@/notification/model/Notification';
import {
  flattenNotificationPages,
  getLastNotificationTimestamp,
  reportNotificationFetchError,
} from './notificationUtils';
import type { Notification } from '@/notification/model/Notification';
import type { CommentNotification } from '@/notification/model/Notification';

function createMockNotification(overrides: Partial<CommentNotification> = {}): Notification {
  return {
    id: 'notification-1',
    type: NotificationType.COMMENT_ON_POST,
    boardId: 'board-1',
    postId: 'post-1',
    commentId: 'comment-1',
    fromUserId: 'user-1',
    message: 'Test notification',
    timestamp: createTimestamp(new Date('2025-01-15T12:00:00Z')),
    read: false,
    ...overrides,
  };
}

describe('notificationUtils', () => {
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
        message: 'Test message',
        read: true,
      });
      const pages = [[notification]];

      const result = flattenNotificationPages(pages);

      expect(result[0]).toEqual(notification);
    });
  });

  describe('getLastNotificationTimestamp', () => {
    it('should return timestamp of last notification', () => {
      const timestamp = createTimestamp(new Date('2025-01-15T12:00:00Z'));
      const notifications = [
        createMockNotification({ id: '1', timestamp: createTimestamp(new Date('2025-01-14')) }),
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
      const timestamp = createTimestamp(new Date('2025-01-15T12:00:00Z'));
      const notifications = [createMockNotification({ timestamp })];

      const result = getLastNotificationTimestamp(notifications);

      expect(result).toBe(timestamp);
    });

    it('should return last notification timestamp regardless of date order', () => {
      // The function returns the timestamp of the last item in array, not the oldest/newest
      const olderTimestamp = createTimestamp(new Date('2025-01-10'));
      const newerTimestamp = createTimestamp(new Date('2025-01-15'));

      const notifications = [
        createMockNotification({ id: '1', timestamp: newerTimestamp }),
        createMockNotification({ id: '2', timestamp: olderTimestamp }), // Last in array
      ];

      const result = getLastNotificationTimestamp(notifications);

      expect(result).toBe(olderTimestamp); // Returns last in array, not newest
    });
  });

  describe('reportNotificationFetchError', () => {
    it('forwards the error to the capture sink', () => {
      const log = vi.fn();
      const capture = vi.fn();
      const error = new Error('fetch failed');

      reportNotificationFetchError(error, { log, capture });

      expect(capture).toHaveBeenCalledTimes(1);
      expect(capture).toHaveBeenCalledWith(error);
    });

    it('logs the error with the Korean prefix', () => {
      const log = vi.fn();
      const capture = vi.fn();
      const error = new Error('boom');

      reportNotificationFetchError(error, { log, capture });

      expect(log).toHaveBeenCalledTimes(1);
      const [message, loggedError] = log.mock.calls[0];
      expect(message).toContain('알림 데이터를 불러오던');
      expect(loggedError).toBe(error);
    });

    it('passes non-Error values through to both sinks unchanged', () => {
      const log = vi.fn();
      const capture = vi.fn();
      const value = { code: 500, payload: null };

      reportNotificationFetchError(value, { log, capture });

      expect(log.mock.calls[0][1]).toBe(value);
      expect(capture).toHaveBeenCalledWith(value);
    });
  });
});
