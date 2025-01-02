import { useEffect, useCallback } from 'react';

interface UseScrollRestorationProps {
  key: string;
  enabled?: boolean;
  deps?: any[];
}

export const useScrollRestoration = ({ 
  key, 
  enabled = true,
  deps = [] 
}: UseScrollRestorationProps) => {
  const restoreScrollPosition = useCallback(() => {
    if (!enabled || !key) return;

    try {
      const savedScrollPosition = sessionStorage.getItem(`scrollPosition-${key}`);
      if (savedScrollPosition) {
        setTimeout(() => {
          window.scrollTo({
            top: parseInt(savedScrollPosition, 10),
            behavior: 'instant'
          });
        }, 100);
      }
    } catch (error) {
      console.error('Scroll restoration failed:', error);
    }
  }, [key, enabled]);

  const saveScrollPosition = useCallback(() => {
    if (!enabled || !key) return;
    
    try {
      sessionStorage.setItem(`scrollPosition-${key}`, window.scrollY.toString());
    } catch (error) {
      console.error('Failed to save scroll position:', error);
    }
  }, [key, enabled]);

  useEffect(() => {
    restoreScrollPosition();
  }, [restoreScrollPosition, ...deps]);

  useEffect(() => {
    return () => {
      saveScrollPosition();
    };
  }, [saveScrollPosition]);

  return { saveScrollPosition };
};
