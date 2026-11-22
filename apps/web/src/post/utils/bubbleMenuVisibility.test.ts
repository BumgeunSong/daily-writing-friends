import { describe, it, expect } from 'vitest';
import { shouldShowBubbleMenu } from './bubbleMenuVisibility';

const textSelection = {
  isEmpty: false,
  isNodeSelection: false,
  isComposing: false,
  hasFocus: true,
};

describe('shouldShowBubbleMenu', () => {
  it('포커스가 있는 텍스트 선택에서는 보인다', () => {
    expect(shouldShowBubbleMenu(textSelection)).toBe(true);
  });

  it('빈 선택(커서만 있음)에서는 숨긴다', () => {
    expect(shouldShowBubbleMenu({ ...textSelection, isEmpty: true })).toBe(false);
  });

  it('이미지 같은 노드 선택에서는 숨긴다', () => {
    expect(shouldShowBubbleMenu({ ...textSelection, isNodeSelection: true })).toBe(false);
  });

  it('에디터와 메뉴 어디에도 포커스가 없으면 숨긴다', () => {
    expect(shouldShowBubbleMenu({ ...textSelection, hasFocus: false })).toBe(false);
  });

  it('한글 IME 조합 중에는 선택이 있어도 숨긴다', () => {
    expect(shouldShowBubbleMenu({ ...textSelection, isComposing: true })).toBe(false);
  });
});
