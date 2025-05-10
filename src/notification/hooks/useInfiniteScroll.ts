import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { shouldFetchNextPage } from '@/notification/utils/notificationUtils';

interface InfiniteScrollOptions {
  hasNextPage: boolean | undefined;
  fetchNextPage: () => Promise<unknown>;
  isFetchingNextPage: boolean;
}

/**
 * 무한 스크롤 기능을 제공하는 커스텀 훅
 * - Intersection Observer를 사용하여 스크롤 감지
 * - 다음 페이지 로드 조건 확인
 */
export const useInfiniteScroll = ({ 
  hasNextPage, 
  fetchNextPage,
  isFetchingNextPage 
}: InfiniteScrollOptions) => {
  const [ref, inView] = useInView();

  // ACTION - 무한 스크롤 효과
  useEffect(() => {
    if (shouldFetchNextPage(inView, hasNextPage) && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage, isFetchingNextPage]);

  return {
    observerRef: ref,
    isInView: inView,
    isLoading: isFetchingNextPage
  };
}; 