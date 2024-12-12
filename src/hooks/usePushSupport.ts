import { useState, useEffect } from 'react';

interface PushSupportState {
  isIOSSafari: boolean;
  isPWA: boolean;
  isPushSupported: boolean;
}

export const usePushSupport = (): PushSupportState => {
  const [isIOSSafari, setIsIOSSafari] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);

  useEffect(() => {
    // 푸시 알림 지원 여부 확인
    const checkPushSupport = () => {
      return 'Notification' in window && 
             'serviceWorker' in navigator && 
             'PushManager' in window;
    };

    // iOS Safari 체크
    const checkIOSSafari = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      return isIOS && isSafari;
    };

    // PWA 체크
    const checkPWA = () => {
      return window.matchMedia('(display-mode: standalone)').matches;
    };

    setIsIOSSafari(checkIOSSafari());
    setIsPWA(checkPWA());
    setIsPushSupported(checkPushSupport());

    // PWA 상태 변경 감지
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
    isPWA,
    isPushSupported,
  };
};
