import type { ReactNode } from 'react';
import type React from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from '@/shared/navigation';
import { useScrollDirection } from '@/shared/hooks/useScrollDirection';

interface NavigationContextType {
  isNavVisible: boolean;
}

// 기본값 설정
const defaultContextValue: NavigationContextType = {
  isNavVisible: true
};

// 컨텍스트 생성
const NavigationContext = createContext<NavigationContextType>(defaultContextValue);

interface NavigationProviderProps {
  children: ReactNode;
  debounceTime?: number;
  topThreshold?: number;
  ignoreSmallChanges?: number;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
  children,
  debounceTime = 500,
  topThreshold = 10,
  ignoreSmallChanges = 5
}) => {
  // 네비게이션 바 표시 상태
  const [isNavVisible, setIsNavVisible] = useState<boolean>(true);

  // 라우트가 바뀌면 항상 하단 내비를 보이는 상태로 시작한다. 스크롤 감지 침묵은
  // navigationLifecycle이 forward/back/popstate에서 직접 다루므로 여기서는 다루지 않는다.
  const location = useLocation();
  const prevPathnameRef = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname === prevPathnameRef.current) return;
    prevPathnameRef.current = location.pathname;
    setIsNavVisible(true);
  }, [location.pathname]);

  // 스크롤 방향 감지 훅 사용 - 업데이트된 옵션 패턴 사용
  const scrollDirection = useScrollDirection({
    throttleTime: debounceTime,
    topThreshold,
    ignoreSmallChanges
  });

  // Sync isNavVisible to scrollDirection during render, with a prev-value comparison,
  // so the nav doesn't briefly show a stale visibility between renders.
  const [prevScrollDirection, setPrevScrollDirection] = useState(scrollDirection);
  if (scrollDirection !== prevScrollDirection) {
    setPrevScrollDirection(scrollDirection);
    if (scrollDirection === 'down') {
      setIsNavVisible(false);
    } else if (scrollDirection === 'up') {
      setIsNavVisible(true);
    }
  }
  
  return (
    <NavigationContext.Provider value={{ isNavVisible }}>
      {children}
    </NavigationContext.Provider>
  );
};

// 커스텀 훅으로 컨텍스트 사용
export const useNavigation = () => {
  const context = useContext(NavigationContext);
  
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  
  return context;
}; 