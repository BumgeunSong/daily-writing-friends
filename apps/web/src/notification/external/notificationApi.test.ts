import { vi, describe, it, expect, beforeEach } from 'vitest';

import { createTimestamp } from '@/shared/model/Timestamp';
import { NotificationType } from '@/notification/model/Notification';
import { fetchNotifications } from './notificationApi';

const mockFetchNotificationsFromSupabase = vi.fn();
vi.mock('./notificationReads', () => ({
  fetchNotificationsFromSupabase: (...args: unknown[]) =>
    mockFetchNotificationsFromSupabase(...args),
}));

describe('fetchNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when Supabase returns notifications', () => {
    it('forwards the parsed Notification list from the boundary', async () => {
      const now = new Date();
      const expected = [
        {
          id: 'notif-1',
          type: NotificationType.COMMENT_ON_POST,
          boardId: 'board-1',
          postId: 'post-1',
          commentId: 'comment-1',
          fromUserId: 'user-1',
          message: 'Test',
          timestamp: createTimestamp(now),
          read: false,
        },
      ];
      mockFetchNotificationsFromSupabase.mockResolvedValue(expected);

      const result = await fetchNotifications('user-123', 10);

      expect(result).toEqual(expected);
    });
  });

  describe('when Supabase returns no rows', () => {
    it('returns an empty array', async () => {
      mockFetchNotificationsFromSupabase.mockResolvedValue([]);

      const result = await fetchNotifications('user-123', 10);

      expect(result).toEqual([]);
    });
  });

  describe('when called with a cursor timestamp', () => {
    it('forwards the cursor as an ISO string to Supabase', async () => {
      const cursorTimestamp = createTimestamp(new Date(Date.now() - 1_000_000));
      mockFetchNotificationsFromSupabase.mockResolvedValue([]);

      await fetchNotifications('user-123', 10, cursorTimestamp);

      expect(mockFetchNotificationsFromSupabase).toHaveBeenCalledWith(
        'user-123',
        10,
        cursorTimestamp.toDate().toISOString(),
      );
    });
  });
});
