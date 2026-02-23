import type { RefObject } from 'react';
import { useRef, useState, useEffect } from 'react';

interface ScrollIndicators {
  scrollContainerRef: RefObject<HTMLDivElement>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
}

export function useScrollIndicators(): ScrollIndicators {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return;

    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;

    // Can scroll left if scrolled more than 1px from the beginning
    setCanScrollLeft(scrollLeft > 1);

    // Can scroll right if not at the end
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1); // -1 for rounding errors
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // Check initial scroll state
    checkScrollability();

    // Add scroll event listener
    scrollContainer.addEventListener('scroll', checkScrollability);

    // Add resize event listener to recheck on window resize
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