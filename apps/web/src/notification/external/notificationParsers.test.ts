import { describe, expect, it } from 'vitest';

import { NotificationType } from '@/notification/model/Notification';

import { parseNotificationRow, type SupabaseNotificationRow } from './notificationParsers';

const baseRow: SupabaseNotificationRow = {
  id: 'n1',
  type: NotificationType.COMMENT_ON_POST,
  board_id: 'b1',
  post_id: 'p1',
  comment_id: 'c1',
  reply_id: null,
  actor_id: 'u1',
  message: 'test',
  created_at: '2026-01-15T09:00:00Z',
  read: false,
};

describe('parseNotificationRow', () => {
  describe('happy path: all 6 notification types', () => {
    it('parses COMMENT_ON_POST', () => {
      const result = parseNotificationRow({
        ...baseRow,
        type: NotificationType.COMMENT_ON_POST,
        comment_id: 'c1',
      });
      expect(result.type).toBe(NotificationType.COMMENT_ON_POST);
      expect(result.id).toBe('n1');
      expect(result.boardId).toBe('b1');
      expect(result.postId).toBe('p1');
      expect(result.fromUserId).toBe('u1');
      expect(result.timestamp.toDate()).toBeInstanceOf(Date);
      if (result.type === NotificationType.COMMENT_ON_POST) {
        expect(result.commentId).toBe('c1');
      }
    });

    it('parses REPLY_ON_COMMENT', () => {
      const result = parseNotificationRow({
        ...baseRow,
        type: NotificationType.REPLY_ON_COMMENT,
        comment_id: 'c1',
        reply_id: 'r1',
      });
      expect(result.type).toBe(NotificationType.REPLY_ON_COMMENT);
      if (result.type === NotificationType.REPLY_ON_COMMENT) {
        expect(result.commentId).toBe('c1');
        expect(result.replyId).toBe('r1');
      }
    });

    it('parses REPLY_ON_POST', () => {
      const result = parseNotificationRow({
        ...baseRow,
        type: NotificationType.REPLY_ON_POST,
        comment_id: null,
        reply_id: 'r1',
      });
      expect(result.type).toBe(NotificationType.REPLY_ON_POST);
      if (result.type === NotificationType.REPLY_ON_POST) {
        expect(result.replyId).toBe('r1');
      }
    });

    it('parses REACTION_ON_COMMENT', () => {
      const result = parseNotificationRow({
        ...baseRow,
        type: NotificationType.REACTION_ON_COMMENT,
        comment_id: 'c1',
      });
      expect(result.type).toBe(NotificationType.REACTION_ON_COMMENT);
      if (result.type === NotificationType.REACTION_ON_COMMENT) {
        expect(result.commentId).toBe('c1');
      }
    });

    it('parses REACTION_ON_REPLY', () => {
      const result = parseNotificationRow({
        ...baseRow,
        type: NotificationType.REACTION_ON_REPLY,
        comment_id: 'c1',
        reply_id: 'r1',
      });
      expect(result.type).toBe(NotificationType.REACTION_ON_REPLY);
      if (result.type === NotificationType.REACTION_ON_REPLY) {
        expect(result.commentId).toBe('c1');
        expect(result.replyId).toBe('r1');
      }
    });

    it('parses LIKE_ON_POST', () => {
      const result = parseNotificationRow({
        ...baseRow,
        type: NotificationType.LIKE_ON_POST,
        comment_id: null,
        reply_id: null,
      });
      expect(result.type).toBe(NotificationType.LIKE_ON_POST);
    });
  });

  describe('runtime guard: throws on missing required fields', () => {
    it('COMMENT_ON_POST missing commentId throws', () => {
      const row = { ...baseRow, type: NotificationType.COMMENT_ON_POST, comment_id: null };
      expect(() => parseNotificationRow(row)).toThrow('COMMENT_ON_POST missing commentId');
    });

    it('REPLY_ON_COMMENT missing commentId throws', () => {
      const row = {
        ...baseRow,
        type: NotificationType.REPLY_ON_COMMENT,
        comment_id: null,
        reply_id: 'r1',
      };
      expect(() => parseNotificationRow(row)).toThrow(
        'REPLY_ON_COMMENT missing commentId or replyId',
      );
    });

    it('REPLY_ON_COMMENT missing replyId throws', () => {
      const row = {
        ...baseRow,
        type: NotificationType.REPLY_ON_COMMENT,
        comment_id: 'c1',
        reply_id: null,
      };
      expect(() => parseNotificationRow(row)).toThrow(
        'REPLY_ON_COMMENT missing commentId or replyId',
      );
    });

    it('REPLY_ON_POST missing replyId throws', () => {
      const row = { ...baseRow, type: NotificationType.REPLY_ON_POST, reply_id: null };
      expect(() => parseNotificationRow(row)).toThrow('REPLY_ON_POST missing replyId');
    });

    it('REACTION_ON_COMMENT missing commentId throws', () => {
      const row = { ...baseRow, type: NotificationType.REACTION_ON_COMMENT, comment_id: null };
      expect(() => parseNotificationRow(row)).toThrow('REACTION_ON_COMMENT missing commentId');
    });

    it('REACTION_ON_REPLY missing commentId throws', () => {
      const row = {
        ...baseRow,
        type: NotificationType.REACTION_ON_REPLY,
        comment_id: null,
        reply_id: 'r1',
      };
      expect(() => parseNotificationRow(row)).toThrow(
        'REACTION_ON_REPLY missing commentId or replyId',
      );
    });

    it('REACTION_ON_REPLY missing replyId throws', () => {
      const row = {
        ...baseRow,
        type: NotificationType.REACTION_ON_REPLY,
        comment_id: 'c1',
        reply_id: null,
      };
      expect(() => parseNotificationRow(row)).toThrow(
        'REACTION_ON_REPLY missing commentId or replyId',
      );
    });
  });

  describe('unknown type: rejected at boundary', () => {
    it('throws on unknown notification type string', () => {
      const row = { ...baseRow, type: 'invalid_type' };
      expect(() => parseNotificationRow(row)).toThrow(
        'unknown notification type: invalid_type',
      );
    });
  });
});
