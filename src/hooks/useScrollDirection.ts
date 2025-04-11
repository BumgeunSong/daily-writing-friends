import { useState, useEffect } from 'react';

export type ScrollDirection = 'up' | 'down' | 'none';

/**
 * 스크롤 방향을 감지하는 커스텀 훅
 * @param debounceTime 디바운스 시간 (밀리초)
 * @returns 현재 스크롤 방향 ('up', 'down', 'none')
 */
export const useScrollDirection = (debounceTime: number = 300): ScrollDirection => {
  // 스크롤 방향 상태
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('none');
  
  // 이전 스크롤 위치 상태
  const [lastScrollY, setLastScrollY] = useState<number>(0);
  
  // 타이머 ID 참조
  let debounceTimer: NodeJS.Timeout | null = null;

  useEffect(() => {
    // 컴포넌트 마운트 시 초기 스크롤 위치 설정
    setLastScrollY(window.scrollY);
    
    // 스크롤 이벤트 핸들러
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // 디바운스 적용
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = setTimeout(() => {
        // 스크롤 방향 계산
        if (currentScrollY > lastScrollY) {
          // 아래로 스크롤
          if (scrollDirection !== 'down') {
            setScrollDirection('down');
          }
        } else if (currentScrollY < lastScrollY) {
          // 위로 스크롤
          if (scrollDirection !== 'up') {
            setScrollDirection('up');
          }
        }
        
        // 현재 스크롤 위치를 마지막 위치로 업데이트
        setLastScrollY(currentScrollY);
      }, debounceTime);
    };
    
    // 스크롤 이벤트 리스너 등록
    window.addEventListener('scroll', handleScroll);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 및 타이머 정리
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [lastScrollY, scrollDirection, debounceTime]);
  
  return scrollDirection;
}; 