import { useState, useEffect } from 'react';

interface PushSupportState {
  isIOSSafari: boolean;
  isAndroid: boolean;
  isPWA: boolean;
  isPushSupported: boolean;
  isLoading: boolean;
}

export const usePushSupport = (): PushSupportState => {
  const [supportState, setSupportState] = useState<PushSupportState>({
    isIOSSafari: false,
    isAndroid: false,
    isPWA: false,
    isPushSupported: false,
    isLoading: true
  });

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

    // 모든 상태를 한 번에 업데이트
    setSupportState({
      isIOSSafari: checkIOSSafari(),
      isPWA: checkPWA(),
      isPushSupported: checkPushSupport(),
      isAndroid: checkAndroid(),
      isLoading: false
    });

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSupportState(prev => ({
        ...prev,
        isPWA: e.matches
      }));
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return supportState;
};
