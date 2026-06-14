'use client';

import { useQueryClient } from '@tanstack/react-query';
import { PenSquare } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from '@/shared/navigation';
import PostCard from '@/post/components/PostCard';
import { useBatchPostCardData } from '@/post/hooks/useBatchPostCardData';
import { useRecentPosts } from '@/post/hooks/useRecentPosts';
import { useScrollRestoration } from '@/post/hooks/useScrollRestoration';
import type { Post } from '@/post/model/Post';
import { seedPostCache } from '@/post/utils/postCacheUtils';
import StatusMessage from '@/shared/components/StatusMessage';
import { useRegisterTabHandler } from '@/shared/contexts/BottomTabHandlerContext';
import { usePerformanceMonitoring } from '@/shared/hooks/usePerformanceMonitoring';
import { Button } from '@/shared/ui/button';
import PostCardSkeleton from '@/shared/ui/PostCardSkeleton';
import type React from 'react';

interface RecentPostCardListProps {
  boardId: string;
  onPostClick: (postId: string) => void;
  onClickProfile?: (userId: string) => void;
}

/**
 * 최근 게시글 목록 컴포넌트 (createdAt 내림차순)
 */
const RecentPostCardList: React.FC<RecentPostCardListProps> = ({ boardId, onPostClick, onClickProfile }) => {
  const navigate = useNavigate();
  const [inViewRef, inView] = useInView();
  const [limitCount] = useState(7);
  usePerformanceMonitoring('RecentPostCardList');
  const queryClient = useQueryClient();

  const {
    data: postPages,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRecentPosts(boardId, limitCount);

  const allPosts = postPages?.pages.flat() || [];
  const { data: batchData, isError: isBatchError } = useBatchPostCardData(allPosts);

  // 첫 데이터 도착 시점에는 스태거하지 않고, 이후 다음 페이지로 도착한 카드만 페이드 슬라이드인.
  // 렌더 중에 ref.current를 읽지만, ref는 커밋 이후 effect에서만 변경되므로 동시 모드에서도 안정적이다.
  const settledCountRef = useRef<number | null>(null);
  const staggerThreshold = settledCountRef.current ?? allPosts.length;

  useEffect(() => {
    if (allPosts.length > 0 || settledCountRef.current !== null) {
      settledCountRef.current = allPosts.length;
    }
  }, [allPosts.length]);

  const { saveScrollPosition, restoreScrollPosition } = useScrollRestoration(`${boardId}-posts`);

  const handleRefreshPosts = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    queryClient.invalidateQueries(['posts', boardId]);
  }, [boardId, queryClient]);

  // 홈 탭 핸들러 등록
  useRegisterTabHandler('Home', handleRefreshPosts);

  const handlePostClick = (post: Post) => {
    seedPostCache(queryClient, post);
    onPostClick(post.id);
    saveScrollPosition();
  };

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  useEffect(() => {
    if (boardId) {
      restoreScrollPosition();
    }
  }, [boardId, restoreScrollPosition]);

  if (isLoading) {
    return (
      <div className='space-y-6'>
        {Array.from({ length: 5 }).map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <StatusMessage
        error
        errorMessage='글을 불러오는 중에 문제가 생겼어요. 잠시 후 다시 시도해주세요.'
      />
    );
  }

  if (allPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-start p-8 pt-16 text-center">
        <div className="mb-4 text-6xl text-muted-foreground">
          텅~
        </div>
        <div className="mb-6 text-muted-foreground">게시판이 비어있어요</div>
        <h3 className="mb-6 text-lg font-semibold text-foreground">
          첫 글의 주인공이 되어 볼까요?
        </h3>
        <Button 
          onClick={() => navigate(`/create/${boardId}`)}
          className="flex items-center gap-2"
        >
          <PenSquare className="size-4" />
          글 쓰러 가기
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {allPosts.map((post, index) => {
        const isNewArrival = index >= staggerThreshold;
        const animationDelayMs = isNewArrival
          ? Math.min((index - staggerThreshold) * 40, 200)
          : 0;
        return (
          <div
            key={post.id}
            className={isNewArrival ? 'dwf-content-enter' : undefined}
            style={isNewArrival ? { animationDelay: `${animationDelayMs}ms` } : undefined}
          >
            <PostCard
              post={post}
              onClick={() => handlePostClick(post)}
              onClickProfile={onClickProfile}
              prefetchedData={batchData?.get(post.authorId)}
              isBatchMode={allPosts.length > 0 && !isBatchError}
            />
          </div>
        );
      })}
      <div ref={inViewRef} />
      {isFetchingNextPage && (
        <div className='text-reading-sm flex items-center justify-center p-6 text-muted-foreground'>
          <span>글을 불러오는 중...</span>
        </div>
      )}
    </div>
  );
};

export default RecentPostCardList;
