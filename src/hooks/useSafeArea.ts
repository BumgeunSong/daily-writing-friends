import { useState, useEffect } from 'react';

interface SafeArea {
  top: number;
  bottom: number;
}

export function useSafeArea(): SafeArea {
  const [safeArea, setSafeArea] = useState<SafeArea>({ top: 0, bottom: 0 });

  useEffect(() => {
    const updateSafeArea = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.clientHeight;
      const topPadding = (window as any).screenTop ?? 0;
      const bottomPadding = Math.max((windowHeight - documentHeight - topPadding), 0);

      setSafeArea({
        top: topPadding,
        bottom: bottomPadding,
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    return () => window.removeEventListener('resize', updateSafeArea);
  }, []);

  return safeArea;
}

