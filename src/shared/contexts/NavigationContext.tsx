import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  
  // 스크롤 방향 감지 훅 사용 - 업데이트된 옵션 패턴 사용
  const scrollDirection = useScrollDirection({
    throttleTime: debounceTime,
    topThreshold,
    ignoreSmallChanges
  });
  
  useEffect(() => {
    // 스크롤 방향에 따라 네비게이션 바 표시 여부 결정
    if (scrollDirection === 'down') {
      setIsNavVisible(false);
    } else if (scrollDirection === 'up') {
      setIsNavVisible(true);
    }
  }, [scrollDirection]);
  
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