import { useEffect } from 'react';

interface UseScrollRestorationProps {
  key: string;
  enabled?: boolean;
}

export const useScrollRestoration = ({ key, enabled = true }: UseScrollRestorationProps) => {
  useEffect(() => {
    if (!enabled || !key) return;

    try {
      const savedScrollPosition = sessionStorage.getItem(`scrollPosition-${key}`);
      if (savedScrollPosition) {
        window.requestAnimationFrame(() => {
          try {
            window.scrollTo({
              top: parseInt(savedScrollPosition, 10),
              behavior: 'instant'
            });
          } catch (error) {
            console.error('Scroll restoration failed:', error);
          }
        });
      }
    } catch (error) {
      console.error('Session storage access failed:', error);
    }

    return () => {
      try {
        sessionStorage.setItem(`scrollPosition-${key}`, window.scrollY.toString());
      } catch (error) {
        console.error('Failed to save scroll position:', error);
      }
    };
  }, [key, enabled]);

  const saveScrollPosition = () => {
    if (!enabled || !key) return;
    
    try {
      sessionStorage.setItem(`scrollPosition-${key}`, window.scrollY.toString());
    } catch (error) {
      console.error('Failed to save scroll position:', error);
    }
  };

  return { saveScrollPosition };
};
