import { useState, useEffect, useRef } from 'react';

export type ScrollDirection = 'up' | 'down' | 'none';

/**
 * 스크롤 방향을 감지하는 커스텀 훅 (쓰로틀링 적용)
 * @param throttleTime 쓰로틀 시간 (밀리초)
 * @returns 현재 스크롤 방향 ('up', 'down', 'none')
 */
export const useScrollDirection = (throttleTime: number = 200): ScrollDirection => {
  // 스크롤 방향 상태
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('none');
  
  // 이전 스크롤 위치 상태
  const [lastScrollY, setLastScrollY] = useState<number>(0);
  
  // 마지막 쓰로틀 시간을 추적하기 위한 ref
  const lastThrottleTimeRef = useRef<number>(0);
  
  // 쓰로틀 타이머를 추적하기 위한 ref
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 컴포넌트 마운트 시 초기 스크롤 위치 설정
    setLastScrollY(window.scrollY);
    
    // 스크롤 이벤트 핸들러
    const handleScroll = () => {
      const currentTime = Date.now();
      const currentScrollY = window.scrollY;
      
      // 쓰로틀링 적용: 마지막 실행 이후 throttleTime이 지났는지 확인
      if (currentTime - lastThrottleTimeRef.current >= throttleTime) {
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
        
        // 현재 스크롤 위치 업데이트
        setLastScrollY(currentScrollY);
        
        // 마지막 쓰로틀 시간 업데이트
        lastThrottleTimeRef.current = currentTime;
      } else {
        // 마지막 쓰로틀 시간이 충분히 지나지 않았다면, 대기 후 실행
        if (throttleTimerRef.current === null) {
          throttleTimerRef.current = setTimeout(() => {
            // 스크롤 방향 계산
            if (window.scrollY > lastScrollY) {
              if (scrollDirection !== 'down') {
                setScrollDirection('down');
              }
            } else if (window.scrollY < lastScrollY) {
              if (scrollDirection !== 'up') {
                setScrollDirection('up');
              }
            }
            
            // 현재 스크롤 위치 업데이트
            setLastScrollY(window.scrollY);
            
            // 쓰로틀 타이머 초기화
            lastThrottleTimeRef.current = Date.now();
            throttleTimerRef.current = null;
          }, throttleTime - (currentTime - lastThrottleTimeRef.current));
        }
      }
    };
    
    // 스크롤 이벤트 리스너 등록
    window.addEventListener('scroll', handleScroll);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 및 타이머 정리
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, [lastScrollY, scrollDirection, throttleTime]);
  
  return scrollDirection;
}; 