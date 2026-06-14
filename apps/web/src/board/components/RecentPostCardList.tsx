'use client';

import { useQueryClient } from '@tanstack/react-query';
import { PenSquare } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from '@/shared/navigation';
import PostCard from '@/post/components/PostCard';
import { useBatchPostCardData } from '@/post/hooks/useBatchPostCardData';
import { useRecentPosts } from '@/post/hooks/useRecentPosts';
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

  const pages = postPages?.pages ?? [];
  const allPosts = pages.flat();
  const { data: batchData, isError: isBatchError } = useBatchPostCardData(allPosts);

  // 첫 데이터가 채워진 시점의 페이지 수를 한 번만 캡처한다. 그 이후 fetchNextPage로 들어온
  // 페이지의 카드들만 스태거 등장. 렌더 중 ref 쓰기는 lazy-init 패턴(useRef와 동일 의미)이라
  // 커밋 타이밍에 의존하지 않는다.
  const baselinePageCountRef = useRef<number | null>(null);
  if (baselinePageCountRef.current === null && pages.length > 0) {
    baselinePageCountRef.current = pages.length;
  }
  const baselinePageCount = baselinePageCountRef.current ?? pages.length;

  const handleRefreshPosts = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    queryClient.invalidateQueries(['posts', boardId]);
  }, [boardId, queryClient]);

  // 홈 탭 핸들러 등록
  useRegisterTabHandler('Home', handleRefreshPosts);

  const handlePostClick = (post: Post) => {
    seedPostCache(queryClient, post);
    onPostClick(post.id);
  };

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

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
      {pages.flatMap((page, pageIndex) => {
        const isNewBatch = pageIndex >= baselinePageCount;
        return page.map((post, postIndexInPage) => {
          const delayMs = isNewBatch ? Math.min(postIndexInPage * 40, 200) : 0;
          return (
            <div
              key={post.id}
              className={isNewBatch ? 'dwf-content-enter' : undefined}
              style={isNewBatch ? { animationDelay: `${delayMs}ms` } : undefined}
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
        });
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
