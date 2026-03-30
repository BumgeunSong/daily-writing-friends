import { createTimestamp } from '@/shared/model/Timestamp';
import { describe, it, expect, vi } from 'vitest';
import { NotificationType } from '@/notification/model/Notification';
import type { NotificationDTO } from '@/shared/api/supabaseReads';
import { mapDTOToNotification } from './notificationApi';

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

  // T.9: topic_presenter_assigned with postId = undefined returns TopicPresenterNotification
  describe('topic_presenter_assigned type', () => {
    it('maps TOPIC_PRESENTER_ASSIGNED with postId undefined (no throw)', () => {
      const dto: NotificationDTO = { ...baseDTO, type: NotificationType.TOPIC_PRESENTER_ASSIGNED, postId: undefined };
      const result = mapDTOToNotification(dto);
      expect(result.type).toBe(NotificationType.TOPIC_PRESENTER_ASSIGNED);
      expect(result.id).toBe('n1');
      expect((result as { postId?: string }).postId).toBeUndefined();
    });
  });

  // T.10: unknown type logs warning and returns generic notification (no throw)
  describe('unknown type: graceful fallback', () => {
    it('logs warning and returns generic notification for unknown type (no throw)', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const dto = { ...baseDTO, type: 'brand_new_type' as NotificationType };
      const result = mapDTOToNotification(dto);
      expect(() => mapDTOToNotification(dto)).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown notification type'));
      expect(result.type).toBe(NotificationType.LIKE_ON_POST);
      warnSpy.mockRestore();
    });
  });

  // T.11: comment_on_post postId still accessed safely (existing behavior unchanged)
  describe('postId backward compatibility', () => {
    it('comment_on_post still maps postId when provided', () => {
      const dto = { ...baseDTO, type: NotificationType.COMMENT_ON_POST, postId: 'p1', commentId: 'c1' };
      const result = mapDTOToNotification(dto);
      expect(result.type).toBe(NotificationType.COMMENT_ON_POST);
      expect((result as { postId?: string }).postId).toBe('p1');
    });
  });
});
