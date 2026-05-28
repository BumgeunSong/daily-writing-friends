import { useState, useEffect, useRef } from 'react';

export type ScrollDirection = 'up' | 'down' | 'none';

interface ScrollOptions {
  throttleTime?: number;
  topThreshold?: number;  // 상단으로 간주할 스크롤 위치 임계값
  ignoreSmallChanges?: number; // 무시할 작은 스크롤 변화량
}

/**
 * 스크롤 방향을 감지하는 커스텀 훅 (쓰로틀링 적용)
 * iOS 바운스 효과 및 페이지 상단 처리 개선
 * @param options 스크롤 감지 옵션
 * @returns 현재 스크롤 방향 ('up', 'down', 'none')
 */
export const useScrollDirection = (options?: ScrollOptions): ScrollDirection => {
  const {
    throttleTime = 200,
    topThreshold = 10,
    ignoreSmallChanges = 5
  } = options || {};

  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('none');

  // Closure-only tracking values — kept in refs so updates do not rebind the listener.
  const lastScrollYRef = useRef<number>(0);
  const lastThrottleTimeRef = useRef<number>(0);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const setDirectionIfChanged = (next: ScrollDirection) => {
      setScrollDirection((prev) => (prev === next ? prev : next));
    };

    const evaluate = (currentScrollY: number, currentTime: number) => {
      if (currentScrollY <= topThreshold) {
        setDirectionIfChanged('up');
        lastScrollYRef.current = currentScrollY;
        lastThrottleTimeRef.current = currentTime;
        return;
      }

      if (Math.abs(currentScrollY - lastScrollYRef.current) < ignoreSmallChanges) {
        return;
      }

      if (currentScrollY > lastScrollYRef.current) {
        setDirectionIfChanged('down');
      } else if (currentScrollY < lastScrollYRef.current) {
        setDirectionIfChanged('up');
      }

      lastScrollYRef.current = currentScrollY;
      lastThrottleTimeRef.current = currentTime;
    };

    const handleScroll = () => {
      const currentTime = Date.now();
      const currentScrollY = window.scrollY;

      // Fast-path: at/near the top — always 'up', bypass throttle.
      if (currentScrollY <= topThreshold) {
        setDirectionIfChanged('up');
        lastScrollYRef.current = currentScrollY;
        lastThrottleTimeRef.current = currentTime;
        return;
      }

      // Fast-path: ignore small deltas (iOS bounce) without scheduling a trailing timer.
      if (Math.abs(currentScrollY - lastScrollYRef.current) < ignoreSmallChanges) {
        return;
      }

      if (currentTime - lastThrottleTimeRef.current >= throttleTime) {
        evaluate(currentScrollY, currentTime);
        return;
      }

      // Trailing call: ensure the final scroll position is processed after the throttle window.
      if (throttleTimerRef.current === null) {
        const delay = throttleTime - (currentTime - lastThrottleTimeRef.current);
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          evaluate(window.scrollY, Date.now());
        }, delay);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [throttleTime, topThreshold, ignoreSmallChanges]);

  return scrollDirection;
};
