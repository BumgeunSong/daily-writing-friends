import { describe, it, expect } from '@jest/globals';
import { calculateEngagementScore, shouldUpdateEngagementScore } from '../calculateEngagementScore';

describe('calculateEngagementScore', () => {
  describe('when post has comments, replies, and likes', () => {
    it('calculates correct score by summing all counts', () => {
      const countOfComments = 5;
      const countOfReplies = 3;
      const countOfLikes = 10;

      const score = calculateEngagementScore(countOfComments, countOfReplies, countOfLikes);

      expect(score).toBe(18);
    });
  });

  describe('when all counts are zero', () => {
    it('returns zero', () => {
      const score = calculateEngagementScore(0, 0, 0);

      expect(score).toBe(0);
    });
  });

  describe('when some counts are undefined', () => {
    it('treats undefined as zero', () => {
      const score = calculateEngagementScore(undefined, 3, undefined);

      expect(score).toBe(3);
    });
  });
});

describe('shouldUpdateEngagementScore', () => {
  describe('when score changed', () => {
    it('returns true', () => {
      const result = shouldUpdateEngagementScore(10, 15);

      expect(result).toBe(true);
    });
  });

  describe('when score unchanged', () => {
    it('returns false', () => {
      const result = shouldUpdateEngagementScore(10, 10);

      expect(result).toBe(false);
    });
  });

  describe('when previous score is undefined', () => {
    it('returns true', () => {
      const result = shouldUpdateEngagementScore(undefined, 5);

      expect(result).toBe(true);
    });
  });

  describe('when both scores are zero', () => {
    it('returns false', () => {
      const result = shouldUpdateEngagementScore(0, 0);

      expect(result).toBe(false);
    });
  });
});
