import type { RefObject } from 'react';
import { useRef, useState, useEffect } from 'react';

interface ScrollIndicators {
  scrollContainerRef: RefObject<HTMLDivElement>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

export interface ScrollIndicatorState {
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

/**
 * Pure decision: given a scroll container's metrics, decide whether arrow
 * indicators should show. The 1px tolerances are intentional — they absorb
 * sub-pixel rounding so the buttons don't flicker at the boundaries.
 */
export function computeScrollIndicators(input: {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
}): ScrollIndicatorState {
  return {
    canScrollLeft: input.scrollLeft > 1,
    canScrollRight: input.scrollLeft + input.clientWidth < input.scrollWidth - 1,
  };
}

export function useScrollIndicators(): ScrollIndicators {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    const next = computeScrollIndicators({ scrollLeft, scrollWidth, clientWidth });
    setCanScrollLeft(next.canScrollLeft);
    setCanScrollRight(next.canScrollRight);
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    checkScrollability();
    scrollContainer.addEventListener('scroll', checkScrollability);
    window.addEventListener('resize', checkScrollability);

    return () => {
      scrollContainer.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, []);

  return {
    scrollContainerRef,
    canScrollLeft,
    canScrollRight,
  };
}
