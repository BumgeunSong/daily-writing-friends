import { useCallback } from 'react';

/**
 * Radix UI의 ScrollArea 컴포넌트에 대한 스크롤 제어 훅
 *
 * @param selector - 특정 ScrollArea를 선택하기 위한 CSS 선택자 (기본값: 첫 번째 ScrollArea)
 * @returns 스크롤 제어 함수들을 포함한 객체
 */
export const useScrollAreaControl = (selector?: string) => {
  /**
   * 스크롤 영역을 최상단으로 이동시킵니다.
   *
   * @param options - 스크롤 옵션 (behavior: 'auto'|'smooth')
   */
  const scrollAreaToTop = useCallback((options?: ScrollToOptions) => {
    // 선택자가 제공되면 해당 선택자에 맞는 ScrollArea의 뷰포트를 찾고,
    // 그렇지 않으면 문서 내 첫 번째 ScrollArea의 뷰포트를 찾습니다.
    const viewportSelector = selector
      ? `${selector} [data-radix-scroll-area-viewport]`
      : '[data-radix-scroll-area-viewport]';

    const viewportElement = document.querySelector(viewportSelector);

    if (viewportElement instanceof HTMLElement) {
      viewportElement.scrollTo({
        top: 0,
        behavior: options?.behavior || 'smooth',
        ...options
      });
    }
  }, [selector]);

  /**
   * 스크롤 영역을 최하단으로 이동시킵니다.
   *
   * @param options - 스크롤 옵션 (behavior: 'auto'|'smooth')
   */
  const scrollAreaToBottom = useCallback((options?: ScrollToOptions) => {
    const viewportSelector = selector
      ? `${selector} [data-radix-scroll-area-viewport]`
      : '[data-radix-scroll-area-viewport]';

    const viewportElement = document.querySelector(viewportSelector);

    if (viewportElement instanceof HTMLElement) {
      const scrollHeight = viewportElement.scrollHeight;
      viewportElement.scrollTo({
        top: scrollHeight,
        behavior: options?.behavior || 'smooth',
        ...options
      });
    }
  }, [selector]);

  /**
   * 스크롤 영역을 특정 위치로 이동시킵니다.
   *
   * @param options - 스크롤 옵션 (top, left, behavior 등)
   */
  const scrollAreaTo = useCallback((options?: ScrollToOptions) => {
    const viewportSelector = selector
      ? `${selector} [data-radix-scroll-area-viewport]`
      : '[data-radix-scroll-area-viewport]';

    const viewportElement = document.querySelector(viewportSelector);

    if (viewportElement instanceof HTMLElement && options) {
      viewportElement.scrollTo({
        behavior: 'smooth',
        ...options
      });
    }
  }, [selector]);

  return {
    scrollAreaToTop,
    scrollAreaToBottom,
    scrollAreaTo
  };
};
