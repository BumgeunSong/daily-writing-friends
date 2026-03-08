import { describe, it, expect } from 'vitest';
import { getTitleMessage, getContentMessage, getHighlight } from './completionMessageUtils';

describe('getTitleMessage', () => {
  describe('when boardPostCountToBe is 1', () => {
    it('returns "1번째 글 작성 완료"', () => {
      expect(getTitleMessage(1)).toBe('1번째 글 작성 완료');
    });
  });

  describe('when boardPostCountToBe is 10', () => {
    it('returns "10번째 글 작성 완료"', () => {
      expect(getTitleMessage(10)).toBe('10번째 글 작성 완료');
    });
  });
});

describe('getContentMessage', () => {
  describe('when contentLength is below threshold (250)', () => {
    it('returns the short-content encouragement message', () => {
      expect(getContentMessage(0)).toBe(
        '짧아도 괜찮아요! 매일 리듬을 만들어나가다보면 좋은 글은 알아서 나와요.',
      );
      expect(getContentMessage(249)).toBe(
        '짧아도 괜찮아요! 매일 리듬을 만들어나가다보면 좋은 글은 알아서 나와요.',
      );
    });
  });

  describe('when contentLength is exactly at the threshold (250)', () => {
    it('returns the long-content praise message', () => {
      expect(getContentMessage(250)).toBe('글 정말 재미있어요! 계속 써주세요.');
    });
  });

  describe('when contentLength is above the threshold', () => {
    it('returns the long-content praise message', () => {
      expect(getContentMessage(500)).toBe('글 정말 재미있어요! 계속 써주세요.');
    });
  });
});

describe('getHighlight', () => {
  describe('when boardPostCountToBe is 3', () => {
    it('returns highlight with "3번째" keyword and purple color', () => {
      expect(getHighlight(3)).toEqual({ keywords: ['3번째'], color: 'purple' });
    });
  });
});
