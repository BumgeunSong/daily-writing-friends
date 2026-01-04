import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useInfiniteScroll } from '../useInfiniteScroll';

// Mock IntersectionObserver
type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

let intersectionCallback: IntersectionCallback | null = null;
let observerInstance: {
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
} | null = null;

const mockIntersectionObserver = vi.fn().mockImplementation((callback: IntersectionCallback) => {
  intersectionCallback = callback;
  observerInstance = {
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  };
  return observerInstance;
});

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: mockIntersectionObserver,
});

describe('useInfiniteScroll', () => {
  const mockFetchNextPage = vi.fn().mockResolvedValue(undefined);
  const mockElement = document.createElement('div');

  beforeEach(() => {
    vi.clearAllMocks();
    intersectionCallback = null;
    observerInstance = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when observer is set up', () => {
    it('creates an IntersectionObserver when ref is set', () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          fetchNextPage: mockFetchNextPage,
          isFetchingNextPage: false,
        })
      );

      act(() => {
        result.current.observerRef(mockElement);
      });

      expect(mockIntersectionObserver).toHaveBeenCalled();
      expect(observerInstance?.observe).toHaveBeenCalledWith(mockElement);
    });

    it('disconnects previous observer when ref changes', () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          fetchNextPage: mockFetchNextPage,
          isFetchingNextPage: false,
        })
      );

      const firstElement = document.createElement('div');
      const secondElement = document.createElement('div');

      act(() => {
        result.current.observerRef(firstElement);
      });

      const firstObserver = observerInstance;

      act(() => {
        result.current.observerRef(secondElement);
      });

      expect(firstObserver?.disconnect).toHaveBeenCalled();
    });

    it('handles null node by cleaning up', () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          fetchNextPage: mockFetchNextPage,
          isFetchingNextPage: false,
        })
      );

      act(() => {
        result.current.observerRef(mockElement);
      });

      const previousObserver = observerInstance;

      act(() => {
        result.current.observerRef(null);
      });

      expect(previousObserver?.disconnect).toHaveBeenCalled();
    });
  });

  describe('when element comes into view', () => {
    it('calls fetchNextPage when hasNextPage is true and not fetching', async () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          fetchNextPage: mockFetchNextPage,
          isFetchingNextPage: false,
        })
      );

      act(() => {
        result.current.observerRef(mockElement);
      });

      act(() => {
        intersectionCallback?.([
          { isIntersecting: true } as IntersectionObserverEntry,
        ]);
      });

      await waitFor(() => {
        expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call fetchNextPage when hasNextPage is false', async () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: false,
          fetchNextPage: mockFetchNextPage,
          isFetchingNextPage: false,
        })
      );

      act(() => {
        result.current.observerRef(mockElement);
      });

      act(() => {
        intersectionCallback?.([
          { isIntersecting: true } as IntersectionObserverEntry,
        ]);
      });

      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });

    it('does not call fetchNextPage when hasNextPage is undefined', async () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: undefined,
          fetchNextPage: mockFetchNextPage,
          isFetchingNextPage: false,
        })
      );

      act(() => {
        result.current.observerRef(mockElement);
      });

      act(() => {
        intersectionCallback?.([
          { isIntersecting: true } as IntersectionObserverEntry,
        ]);
      });

      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });

    it('does not call fetchNextPage when already fetching', async () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          fetchNextPage: mockFetchNextPage,
          isFetchingNextPage: true,
        })
      );

      act(() => {
        result.current.observerRef(mockElement);
      });

      act(() => {
        intersectionCallback?.([
          { isIntersecting: true } as IntersectionObserverEntry,
        ]);
      });

      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });

    it('does not call fetchNextPage when element is not in view', async () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          fetchNextPage: mockFetchNextPage,
          isFetchingNextPage: false,
        })
      );

      act(() => {
        result.current.observerRef(mockElement);
      });

      act(() => {
        intersectionCallback?.([
          { isIntersecting: false } as IntersectionObserverEntry,
        ]);
      });

      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });
  });

  describe('return values', () => {
    it('returns isInView as false initially', () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          fetchNextPage: mockFetchNextPage,
          isFetchingNextPage: false,
        })
      );

      expect(result.current.isInView).toBe(false);
    });

    it('returns isInView as true when element is in view', () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          fetchNextPage: mockFetchNextPage,
          isFetchingNextPage: false,
        })
      );

      act(() => {
        result.current.observerRef(mockElement);
      });

      act(() => {
        intersectionCallback?.([
          { isIntersecting: true } as IntersectionObserverEntry,
        ]);
      });

      expect(result.current.isInView).toBe(true);
    });

    it('returns isLoading reflecting isFetchingNextPage', () => {
      const { result: result1 } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          fetchNextPage: mockFetchNextPage,
          isFetchingNextPage: false,
        })
      );
      expect(result1.current.isLoading).toBe(false);

      const { result: result2 } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          fetchNextPage: mockFetchNextPage,
          isFetchingNextPage: true,
        })
      );
      expect(result2.current.isLoading).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('disconnects observer on unmount', () => {
      const { result, unmount } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          fetchNextPage: mockFetchNextPage,
          isFetchingNextPage: false,
        })
      );

      act(() => {
        result.current.observerRef(mockElement);
      });

      const currentObserver = observerInstance;

      unmount();

      expect(currentObserver?.disconnect).toHaveBeenCalled();
    });
  });
});
