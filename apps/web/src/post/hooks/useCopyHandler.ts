import { useEffect, useCallback } from 'react';
import { convertHtmlToText } from '@/post/utils/contentUtils';

/**
 * HTML 콘텐츠를 순수 텍스트로 복사하는 커스텀 훅
 * 
 * @param getHtml - HTML 콘텐츠를 반환하는 함수
 * @param targetElement - 이벤트를 등록할 DOM 요소 (optional)
 */
export const useCopyHandler = (
  getHtml: () => string,
  targetElement?: HTMLElement | null
) => {
  const handleCopy = useCallback((e: ClipboardEvent) => {
    try {
      const html = getHtml();
      if (!html) return;
      
      const plainText = convertHtmlToText(html);
      if (!plainText) return;
      
      e.clipboardData?.setData('text/plain', plainText);
      e.preventDefault();
    } catch (error) {
      console.error('Copy handler failed:', error);
      // 에러 발생 시 기본 복사 동작 허용
    }
  }, [getHtml]);

  useEffect(() => {
    const element = targetElement || document;
    
    element.addEventListener('copy', handleCopy);
    
    return () => {
      element.removeEventListener('copy', handleCopy);
    };
  }, [handleCopy, targetElement]);
};