import { useEffect, useRef, useCallback, useState } from 'react';

interface InfiniteScrollOptions {
  hasNextPage: boolean | undefined;
  fetchNextPage: () => Promise<unknown>;
  isFetchingNextPage: boolean;
  scrollAreaId?: string;
}

/**
 * Custom hook for infinite scroll functionality.
 * Uses Intersection Observer to detect scroll position and trigger fetching.
 *
 * @example
 * const { observerRef, isLoading } = useInfiniteScroll({
 *   hasNextPage,
 *   fetchNextPage,
 *   isFetchingNextPage,
 * });
 *
 * return (
 *   <div>
 *     {items.map(item => <Item key={item.id} {...item} />)}
 *     <div ref={observerRef} /> // Sentinel element
 *   </div>
 * );
 */
export const useInfiniteScroll = ({
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  scrollAreaId,
}: InfiniteScrollOptions) => {
  const [inView, setInView] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const targetRef = useRef<Element | null>(null);

  const observerCallback = useCallback<IntersectionObserverCallback>((entries) => {
    const [entry] = entries;
    setInView(entry.isIntersecting);
  }, []);

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
      let root: Element | null = null;
      if (scrollAreaId) {
        const scrollArea = document.getElementById(scrollAreaId);
        const viewport = scrollArea?.querySelector('[data-radix-scroll-area-viewport]');
        root = viewport || null;
      }

      // Create observer with root (null = viewport, or custom scroll container)
      observerRef.current = new IntersectionObserver(observerCallback, {
        root,
        rootMargin: '100px',
        threshold: 0,
      });

      observerRef.current.observe(node);
    },
    [scrollAreaId, observerCallback]
  );

  // Fetch next page when in view
  useEffect(() => {
    const shouldFetch = inView && hasNextPage && !isFetchingNextPage;
    if (shouldFetch) {
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
    isLoading: isFetchingNextPage,
  };
};
