import { useState, useEffect } from 'react';

interface PushSupportState {
  isIOSSafari: boolean;
  isAndroid: boolean;
  isPWA: boolean;
  isPushSupported: boolean;
  isLoading: boolean;
}

export const usePushSupport = (): PushSupportState => {
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPushSupport = () => {
      return 'Notification' in window && 
             'serviceWorker' in navigator && 
             'PushManager' in window;
    };

    const checkIOSSafari = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      return isIOS && isSafari;
    };

    const checkPWA = () => {
      return window.matchMedia('(display-mode: standalone)').matches;
    };

    const checkAndroid = () => {
      return navigator.userAgent.includes('Android');
    };

    setIsIOSSafari(checkIOSSafari());
    setIsPWA(checkPWA());
    setIsPushSupported(checkPushSupport());
    setIsAndroid(checkAndroid());
    setIsLoading(false);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsPWA(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return {
    isIOSSafari,
    isAndroid,
    isPWA,
    isPushSupported,
    isLoading,
  };
};
