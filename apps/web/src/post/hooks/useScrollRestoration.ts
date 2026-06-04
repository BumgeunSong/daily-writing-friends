import { useEffect, useCallback } from 'react';

import { scrollPositionKey, sessionStore } from '@/shared/lib/storage';

const restoreScrollPosition = (key: string) => {
  const savedScrollPosition = sessionStore.get(scrollPositionKey(key));
  if (!savedScrollPosition) return;
  const targetPosition = parseInt(savedScrollPosition, 10);
  setTimeout(() => {
    window.scrollTo({
      top: targetPosition,
      behavior: 'instant',
    });
  }, 100);
};

const saveScrollPosition = (key: string) => {
  sessionStore.set(scrollPositionKey(key), window.scrollY.toString());
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
