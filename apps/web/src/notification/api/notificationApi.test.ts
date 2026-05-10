import { vi, describe, it, expect, beforeEach } from 'vitest';

import { createTimestamp } from '@/shared/model/Timestamp';
import { NotificationType } from '@/notification/model/Notification';
import type { NotificationDTO } from './notificationReads';
import { fetchNotifications, mapDTOToNotification } from './notificationApi';

const mockFetchNotificationsFromSupabase = vi.fn();
vi.mock('./notificationReads', () => ({
  fetchNotificationsFromSupabase: (...args: unknown[]) =>
    mockFetchNotificationsFromSupabase(...args),
}));

const baseDTO: NotificationDTO = {
  id: 'n1',
  type: NotificationType.COMMENT_ON_POST,
  boardId: 'b1',
  postId: 'p1',
  commentId: 'c1',
  fromUserId: 'u1',
  message: 'test',
  timestamp: '2026-01-15T09:00:00Z',
  read: false,
};

describe('mapDTOToNotification', () => {
  describe('happy path: all 6 notification types', () => {
    it('maps COMMENT_ON_POST', () => {
      const dto = { ...baseDTO, type: NotificationType.COMMENT_ON_POST, commentId: 'c1' };
      const result = mapDTOToNotification(dto);
      expect(result.type).toBe(NotificationType.COMMENT_ON_POST);
      expect(result.id).toBe('n1');
      expect(result.timestamp.toDate()).toBeInstanceOf(Date);
    });

    it('maps REPLY_ON_COMMENT', () => {
      const dto = { ...baseDTO, type: NotificationType.REPLY_ON_COMMENT, commentId: 'c1', replyId: 'r1' };
      const result = mapDTOToNotification(dto);
      expect(result.type).toBe(NotificationType.REPLY_ON_COMMENT);
      expect(result.timestamp.toDate()).toBeInstanceOf(Date);
    });

    it('maps REPLY_ON_POST', () => {
      const dto = { ...baseDTO, type: NotificationType.REPLY_ON_POST, replyId: 'r1' };
      const result = mapDTOToNotification(dto);
      expect(result.type).toBe(NotificationType.REPLY_ON_POST);
      expect(result.timestamp.toDate()).toBeInstanceOf(Date);
    });

    it('maps REACTION_ON_COMMENT', () => {
      const dto = { ...baseDTO, type: NotificationType.REACTION_ON_COMMENT, commentId: 'c1' };
      const result = mapDTOToNotification(dto);
      expect(result.type).toBe(NotificationType.REACTION_ON_COMMENT);
      expect(result.timestamp.toDate()).toBeInstanceOf(Date);
    });

    it('maps REACTION_ON_REPLY', () => {
      const dto = { ...baseDTO, type: NotificationType.REACTION_ON_REPLY, commentId: 'c1', replyId: 'r1' };
      const result = mapDTOToNotification(dto);
      expect(result.type).toBe(NotificationType.REACTION_ON_REPLY);
      expect(result.timestamp.toDate()).toBeInstanceOf(Date);
    });

    it('maps LIKE_ON_POST', () => {
      const dto = { ...baseDTO, type: NotificationType.LIKE_ON_POST };
      const result = mapDTOToNotification(dto);
      expect(result.type).toBe(NotificationType.LIKE_ON_POST);
      expect(result.timestamp.toDate()).toBeInstanceOf(Date);
    });
  });

  describe('runtime guard: throws on missing required fields', () => {
    it('COMMENT_ON_POST missing commentId throws', () => {
      const dto = { ...baseDTO, type: NotificationType.COMMENT_ON_POST, commentId: undefined };
      expect(() => mapDTOToNotification(dto)).toThrow('COMMENT_ON_POST missing commentId');
    });

    it('REPLY_ON_COMMENT missing commentId throws', () => {
      const dto = { ...baseDTO, type: NotificationType.REPLY_ON_COMMENT, commentId: undefined, replyId: 'r1' };
      expect(() => mapDTOToNotification(dto)).toThrow('REPLY_ON_COMMENT missing commentId or replyId');
    });

    it('REPLY_ON_COMMENT missing replyId throws', () => {
      const dto = { ...baseDTO, type: NotificationType.REPLY_ON_COMMENT, commentId: 'c1', replyId: undefined };
      expect(() => mapDTOToNotification(dto)).toThrow('REPLY_ON_COMMENT missing commentId or replyId');
    });

    it('REPLY_ON_POST missing replyId throws', () => {
      const dto = { ...baseDTO, type: NotificationType.REPLY_ON_POST, replyId: undefined };
      expect(() => mapDTOToNotification(dto)).toThrow('REPLY_ON_POST missing replyId');
    });

    it('REACTION_ON_COMMENT missing commentId throws', () => {
      const dto = { ...baseDTO, type: NotificationType.REACTION_ON_COMMENT, commentId: undefined };
      expect(() => mapDTOToNotification(dto)).toThrow('REACTION_ON_COMMENT missing commentId');
    });

    it('REACTION_ON_REPLY missing commentId throws', () => {
      const dto = { ...baseDTO, type: NotificationType.REACTION_ON_REPLY, commentId: undefined, replyId: 'r1' };
      expect(() => mapDTOToNotification(dto)).toThrow('REACTION_ON_REPLY missing commentId or replyId');
    });

    it('REACTION_ON_REPLY missing replyId throws', () => {
      const dto = { ...baseDTO, type: NotificationType.REACTION_ON_REPLY, commentId: 'c1', replyId: undefined };
      expect(() => mapDTOToNotification(dto)).toThrow('REACTION_ON_REPLY missing commentId or replyId');
    });
  });

  describe('unknown type: default exhaustiveness case', () => {
    it('throws on unknown notification type', () => {
      const dto = { ...baseDTO, type: 'invalid_type' as NotificationType };
      expect(() => mapDTOToNotification(dto)).toThrow('Unknown notification type: invalid_type');
    });
  });
});

describe('fetchNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('when Supabase returns notifications', () => {
    it('maps the rows to Notification domain objects', async () => {
      const now = new Date();

      mockFetchNotificationsFromSupabase.mockResolvedValue([
        {
          id: 'notif-1',
          type: NotificationType.COMMENT_ON_POST,
          boardId: 'board-1',
          postId: 'post-1',
          commentId: 'comment-1',
          fromUserId: 'user-1',
          message: 'Test',
          timestamp: now.toISOString(),
          read: false,
        },
      ]);

      const result = await fetchNotifications('user-123', 10);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-1');
      expect(result[0].message).toBe('Test');
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
      const now = new Date();
      const cursorTimestamp = createTimestamp(new Date(Date.now() - 1_000_000));

      mockFetchNotificationsFromSupabase.mockResolvedValue([
        {
          id: 'notif-page2-1',
          type: NotificationType.COMMENT_ON_POST,
          boardId: 'board-1',
          postId: 'post-1',
          commentId: 'comment-1',
          fromUserId: 'user-1',
          message: 'Page 2 notification',
          timestamp: now.toISOString(),
          read: false,
        },
      ]);

      const result = await fetchNotifications('user-123', 10, cursorTimestamp);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-page2-1');
      expect(mockFetchNotificationsFromSupabase).toHaveBeenCalledWith(
        'user-123',
        10,
        expect.any(String),
      );
    });
  });
});
