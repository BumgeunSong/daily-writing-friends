import { describe, it, expect } from 'vitest';
import { buildNotificationMessage } from '../../../../../supabase/functions/_shared/notificationMessages';

describe('buildNotificationMessage', () => {
  describe('topic_presenter_assigned', () => {
    // T.1: correct Korean string format
    it('returns correct Korean string for topic_presenter_assigned', () => {
      const result = buildNotificationMessage('topic_presenter_assigned', '글쓰기 모임', '애자일 개발 방법론');
      expect(result).toBe("글쓰기 모임에서 이번 주 발표자로 선정되었어요! 발표 주제: '애자일 개발 방법론'");
    });

    // T.2: topic > 35 chars truncates with ellipsis
    it('truncates topic longer than 35 chars with ellipsis', () => {
      const longTopic = '이 주제는 35자가 넘는 매우 긴 발표 주제입니다. 실제로 꽤 길죠.';
      const result = buildNotificationMessage('topic_presenter_assigned', '글쓰기 모임', longTopic);
      const truncated = longTopic.slice(0, 35) + '...';
      expect(result).toBe(`글쓰기 모임에서 이번 주 발표자로 선정되었어요! 발표 주제: '${truncated}'`);
    });
  });
});
