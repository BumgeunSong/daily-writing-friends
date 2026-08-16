import { vi, describe, it, expect, beforeEach } from 'vitest';

import { createTimestamp } from '@/shared/model/Timestamp';
import { NotificationType } from '@/notification/model/Notification';
import { fetchNotifications } from './notification.api';
import type { NotificationPage } from './notification.reads';
import type { NotificationCursor } from './notificationCursor';

const mockFetchNotificationsFromSupabase = vi.fn();
vi.mock('./notification.reads', () => ({
  fetchNotificationsFromSupabase: (...args: unknown[]) =>
    mockFetchNotificationsFromSupabase(...args),
}));

describe('fetchNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when Supabase returns a page', () => {
    it('forwards the parsed page (notifications + nextCursor) from the boundary', async () => {
      const page: NotificationPage = {
        notifications: [
          {
            id: 'notif-1',
            type: NotificationType.COMMENT_ON_POST,
            boardId: 'board-1',
            postId: 'post-1',
            commentId: 'comment-1',
            fromUserId: 'user-1',
            message: 'Test',
            timestamp: createTimestamp(new Date()),
            read: false,
          },
        ],
        nextCursor: { createdAt: '2026-01-15T09:00:00.123456+00:00', id: 'notif-1' },
      };
      mockFetchNotificationsFromSupabase.mockResolvedValue(page);

      const result = await fetchNotifications('user-123', 10);

      expect(result).toEqual(page);
    });
  });

  describe('when Supabase returns an empty page', () => {
    it('forwards the empty page with a null cursor', async () => {
      const page: NotificationPage = { notifications: [], nextCursor: null };
      mockFetchNotificationsFromSupabase.mockResolvedValue(page);

      const result = await fetchNotifications('user-123', 10);

      expect(result).toEqual(page);
    });
  });

  describe('when called with a keyset cursor', () => {
    it('forwards the cursor object to the boundary unchanged', async () => {
      const cursor: NotificationCursor = {
        createdAt: '2026-01-15T09:00:00.123456+00:00',
        id: 'notif-9',
      };
      mockFetchNotificationsFromSupabase.mockResolvedValue({ notifications: [], nextCursor: null });

      await fetchNotifications('user-123', 10, cursor);

      expect(mockFetchNotificationsFromSupabase).toHaveBeenCalledWith('user-123', 10, cursor);
    });
  });
});
