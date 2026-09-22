import { describe, it, expect } from 'vitest';
import { formatJustThreeQuestionsContent } from './justThreeQuestionsContentUtils';

describe('formatJustThreeQuestionsContent', () => {
  describe('when given three question-answer pairs', () => {
    it('formats each pair as "Q. {question} > {answer}" joined by a blank line', () => {
      const content = formatJustThreeQuestionsContent([
        { question: '오늘 기분은?', answer: '좋음' },
        { question: '내일 계획은?', answer: '산책' },
        { question: '지금 생각은?', answer: '평온함' },
      ]);

      expect(content).toBe(
        'Q. 오늘 기분은? > 좋음\n\nQ. 내일 계획은? > 산책\n\nQ. 지금 생각은? > 평온함',
      );
    });
  });

  describe('when an answer contains "<" or ">"', () => {
    it('strips both characters so the shared HTML-detection regex is not triggered', () => {
      const content = formatJustThreeQuestionsContent([
        { question: '좋아하는 표현은?', answer: '<3 love>' },
      ]);

      expect(content).toBe('Q. 좋아하는 표현은? > 3 love');
    });
  });
});
