import { useState, useEffect, useRef } from 'react';
import { isScrollDirectionSuppressed } from '@/shared/navigation/navigationLifecycle';

export type ScrollDirection = 'up' | 'down' | 'none';

export interface ScrollDirectionInput {
  currentY: number;
  lastY: number;
  topThreshold: number;
  ignoreSmallChanges: number;
}

export interface ScrollDirectionDecision {
  direction: 'up' | 'down' | null;
  nextLastY: number | null;
}

/**
 * Pure decision: given current/last scroll positions and the threshold knobs,
 * report whether to change the reported direction and whether to update the
 * tracked baseline.
 *
 * nextLastY === null means "ignore this sample" (iOS bounce / small-delta).
 */
export function decideScrollDirection(input: ScrollDirectionInput): ScrollDirectionDecision {
  const { currentY, lastY, topThreshold, ignoreSmallChanges } = input;

  if (currentY <= topThreshold) {
    return { direction: 'up', nextLastY: currentY };
  }
  if (Math.abs(currentY - lastY) < ignoreSmallChanges) {
    return { direction: null, nextLastY: null };
  }
  if (currentY > lastY) {
    return { direction: 'down', nextLastY: currentY };
  }
  if (currentY < lastY) {
    return { direction: 'up', nextLastY: currentY };
  }
  return { direction: null, nextLastY: currentY };
}

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

  const lastScrollYRef = useRef<number>(0);
  const lastThrottleTimeRef = useRef<number>(0);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const applyDecision = (decision: ScrollDirectionDecision, currentTime: number) => {
      const next = decision.direction;
      if (next !== null) {
        setScrollDirection((prev) => (prev === next ? prev : next));
      }
      if (decision.nextLastY !== null) {
        lastScrollYRef.current = decision.nextLastY;
      }
      lastThrottleTimeRef.current = currentTime;
    };

    const handleScroll = () => {
      const currentTime = Date.now();
      const currentScrollY = window.scrollY;

      // 라우트 전환 직후의 프로그래매틱 스크롤 복원은 사용자 의도가 아니므로
      // baseline만 따라 올리고 방향 변경 이벤트는 발행하지 않는다.
      if (isScrollDirectionSuppressed()) {
        lastScrollYRef.current = currentScrollY;
        lastThrottleTimeRef.current = currentTime;
        return;
      }

      const decision = decideScrollDirection({
        currentY: currentScrollY,
        lastY: lastScrollYRef.current,
        topThreshold,
        ignoreSmallChanges,
      });

      // Fast-path: at/near the top — always apply, bypass throttle.
      if (currentScrollY <= topThreshold) {
        applyDecision(decision, currentTime);
        return;
      }

      // Fast-path: small delta (iOS bounce) — ignore without scheduling a trailing timer.
      if (decision.direction === null && decision.nextLastY === null) {
        return;
      }

      if (currentTime - lastThrottleTimeRef.current >= throttleTime) {
        applyDecision(decision, currentTime);
        return;
      }

      // Trailing call: ensure the final scroll position is processed after the throttle window.
      if (throttleTimerRef.current === null) {
        const delay = throttleTime - (currentTime - lastThrottleTimeRef.current);
        throttleTimerRef.current = setTimeout(() => {
          throttleTimerRef.current = null;
          const trailingDecision = decideScrollDirection({
            currentY: window.scrollY,
            lastY: lastScrollYRef.current,
            topThreshold,
            ignoreSmallChanges,
          });
          applyDecision(trailingDecision, Date.now());
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
