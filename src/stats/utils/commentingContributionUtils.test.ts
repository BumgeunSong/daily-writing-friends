import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { aggregateCommentingContributions } from './commentingContributionUtils';
import type { Commenting } from '@/user/model/Commenting';
import type { Replying } from '@/user/model/Replying';

function createMockCommenting(dateStr: string): Commenting {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return {
    board: { id: 'board1' },
    post: { id: 'post1', title: 'Test Post', authorId: 'author1' },
    comment: { id: `comment-${dateStr}`, content: 'Test comment' },
    createdAt: Timestamp.fromDate(date),
  };
}

function createMockReplying(dateStr: string): Replying {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return {
    board: { id: 'board1' },
    post: { id: 'post1', title: 'Test Post', authorId: 'author1' },
    comment: { id: 'comment1', authorId: 'commentAuthor1' },
    reply: { id: `reply-${dateStr}` },
    createdAt: Timestamp.fromDate(date),
  };
}

describe('commentingContributionUtils', () => {
  describe('aggregateCommentingContributions', () => {
    it('should return contributions for all working days', () => {
      const workingDays = [
        new Date('2025-01-01'),
        new Date('2025-01-02'),
        new Date('2025-01-03'),
      ];

      const result = aggregateCommentingContributions([], [], workingDays);

      expect(result).toHaveLength(3);
      expect(result[0].createdAt).toBe('2025-01-01');
      expect(result[1].createdAt).toBe('2025-01-02');
      expect(result[2].createdAt).toBe('2025-01-03');
    });

    it('should count commentings by date', () => {
      const commentings = [
        createMockCommenting('2025-01-01'),
        createMockCommenting('2025-01-01'),
        createMockCommenting('2025-01-02'),
      ];
      const workingDays = [
        new Date('2025-01-01'),
        new Date('2025-01-02'),
        new Date('2025-01-03'),
      ];

      const result = aggregateCommentingContributions(commentings, [], workingDays);

      expect(result[0].countOfCommentAndReplies).toBe(2);
      expect(result[1].countOfCommentAndReplies).toBe(1);
      expect(result[2].countOfCommentAndReplies).toBeNull();
    });

    it('should count replyings by date', () => {
      const replyings = [
        createMockReplying('2025-01-01'),
        createMockReplying('2025-01-02'),
        createMockReplying('2025-01-02'),
      ];
      const workingDays = [
        new Date('2025-01-01'),
        new Date('2025-01-02'),
        new Date('2025-01-03'),
      ];

      const result = aggregateCommentingContributions([], replyings, workingDays);

      expect(result[0].countOfCommentAndReplies).toBe(1);
      expect(result[1].countOfCommentAndReplies).toBe(2);
      expect(result[2].countOfCommentAndReplies).toBeNull();
    });

    it('should combine commentings and replyings on same day', () => {
      const commentings = [
        createMockCommenting('2025-01-01'),
        createMockCommenting('2025-01-01'),
      ];
      const replyings = [
        createMockReplying('2025-01-01'),
        createMockReplying('2025-01-01'),
        createMockReplying('2025-01-01'),
      ];
      const workingDays = [new Date('2025-01-01')];

      const result = aggregateCommentingContributions(commentings, replyings, workingDays);

      expect(result[0].countOfCommentAndReplies).toBe(5);
    });

    it('should return null for days without activity', () => {
      const commentings = [createMockCommenting('2025-01-01')];
      const workingDays = [
        new Date('2025-01-01'),
        new Date('2025-01-02'),
      ];

      const result = aggregateCommentingContributions(commentings, [], workingDays);

      expect(result[0].countOfCommentAndReplies).toBe(1);
      expect(result[1].countOfCommentAndReplies).toBeNull();
    });

    it('should handle empty inputs', () => {
      const result = aggregateCommentingContributions([], [], []);

      expect(result).toEqual([]);
    });

    it('should handle empty commentings and replyings with working days', () => {
      const workingDays = [new Date('2025-01-01'), new Date('2025-01-02')];

      const result = aggregateCommentingContributions([], [], workingDays);

      expect(result).toHaveLength(2);
      expect(result[0].countOfCommentAndReplies).toBeNull();
      expect(result[1].countOfCommentAndReplies).toBeNull();
    });

    it('should ignore activity on days not in workingDays', () => {
      const commentings = [
        createMockCommenting('2025-01-01'),
        createMockCommenting('2025-01-05'),
      ];
      const workingDays = [new Date('2025-01-01')];

      const result = aggregateCommentingContributions(commentings, [], workingDays);

      expect(result).toHaveLength(1);
      expect(result[0].countOfCommentAndReplies).toBe(1);
    });

    it('should handle mixed activity across multiple days', () => {
      const commentings = [
        createMockCommenting('2025-01-01'),
        createMockCommenting('2025-01-03'),
      ];
      const replyings = [
        createMockReplying('2025-01-01'),
        createMockReplying('2025-01-02'),
        createMockReplying('2025-01-03'),
      ];
      const workingDays = [
        new Date('2025-01-01'),
        new Date('2025-01-02'),
        new Date('2025-01-03'),
      ];

      const result = aggregateCommentingContributions(commentings, replyings, workingDays);

      expect(result[0].countOfCommentAndReplies).toBe(2);
      expect(result[1].countOfCommentAndReplies).toBe(1);
      expect(result[2].countOfCommentAndReplies).toBe(2);
    });
  });
});
