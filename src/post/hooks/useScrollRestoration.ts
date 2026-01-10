import { useEffect, useCallback } from 'react';

// 스크롤 위치 복원 함수
const restoreScrollPosition = (key: string) => {
  try {
    const savedScrollPosition = sessionStorage.getItem(`scrollPosition-${key}`);
    if (savedScrollPosition) {
      const targetPosition = parseInt(savedScrollPosition, 10);
      setTimeout(() => {
        window.scrollTo({
          top: targetPosition,
          behavior: 'instant'
        });
      }, 100);
    }
  } catch (error) {
    console.error('❌ Scroll restoration failed:', error);
  }
};

// 스크롤 위치 저장 함수
const saveScrollPosition = (key: string) => {
  try {
    const currentPosition = window.scrollY;
    sessionStorage.setItem(`scrollPosition-${key}`, currentPosition.toString());
  } catch (error) {
    console.error('❌ Failed to save scroll position:', error);
  }
};

export const useScrollRestoration = (key: string) => {
  const handleRestoreScroll = useCallback(() => {
    if (!key) return;
    restoreScrollPosition(key);
  }, [key]);

  const handleSaveScroll = useCallback(() => {
    if (!key) return;
    saveScrollPosition(key);
  }, [key]);

  useEffect(() => {
    handleRestoreScroll();

    window.addEventListener('beforeunload', handleSaveScroll);
    window.addEventListener('popstate', handleSaveScroll);

    return () => {
      window.removeEventListener('beforeunload', handleSaveScroll);
      window.removeEventListener('popstate', handleSaveScroll);
    };
  }, [key, handleRestoreScroll, handleSaveScroll]);

  return {
    saveScrollPosition: handleSaveScroll,
    restoreScrollPosition: handleRestoreScroll,
  };
};
