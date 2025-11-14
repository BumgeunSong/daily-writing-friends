import { useEffect, useRef, useCallback, useState } from 'react';
import { shouldFetchNextPage } from '@/notification/utils/notificationUtils';

interface InfiniteScrollOptions {
  hasNextPage: boolean | undefined;
  fetchNextPage: () => Promise<unknown>;
  isFetchingNextPage: boolean;
  scrollAreaId?: string;
}

/**
 * 무한 스크롤 기능을 제공하는 커스텀 훅
 * - Intersection Observer를 사용하여 스크롤 감지
 * - 다음 페이지 로드 조건 확인
 */
export const useInfiniteScroll = ({
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  scrollAreaId
}: InfiniteScrollOptions) => {
  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const targetRef = useRef<Element | null>(null);

  const observerCallback = useCallback<IntersectionObserverCallback>(
    (entries) => {
      const [entry] = entries;
      setInView(entry.isIntersecting);
    },
    []
  );

  const setRef = useCallback(
    (node: Element | null) => {
      // Cleanup previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node) {
        targetRef.current = null;
        return;
      }

      targetRef.current = node;

      // Find the scroll root
      if (scrollAreaId) {
        const scrollArea = document.getElementById(scrollAreaId);
        const viewport = scrollArea?.querySelector('[data-radix-scroll-area-viewport]');

        observerRef.current = new IntersectionObserver(observerCallback, {
          root: viewport,
          rootMargin: '100px',
          threshold: 0,
        });

        observerRef.current.observe(node);
      }
    },
    [scrollAreaId, observerCallback]
  );

  // ACTION - 무한 스크롤 효과
  useEffect(() => {
    if (shouldFetchNextPage(inView, hasNextPage) && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage, isFetchingNextPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    observerRef: setRef,
    isInView: inView,
    isLoading: isFetchingNextPage
  };
}; 