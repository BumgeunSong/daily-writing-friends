'use client';

import { useQueryClient } from '@tanstack/react-query';
import { PenSquare } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from '@/shared/navigation';
import PostCard from '@/post/components/PostCard';
import { useBatchPostCardData, type PostCardPrefetchedData } from '@/post/hooks/useBatchPostCardData';
import { useRecentPosts } from '@/post/hooks/useRecentPosts';
import type { Post } from '@/post/model/Post';
import { seedPostCache } from '@/post/utils/postCacheUtils';
import StatusMessage from '@/shared/components/StatusMessage';
import { useRegisterTabHandler } from '@/shared/contexts/BottomTabHandlerContext';
import { usePerformanceMonitoring } from '@/shared/hooks/usePerformanceMonitoring';
import { Button } from '@/shared/ui/button';
import PostCardSkeleton from '@/shared/ui/PostCardSkeleton';
import type React from 'react';

const POSTS_PER_PAGE = 7;
const LOADING_SKELETON_COUNT = 5;
const ENTER_STAGGER_STEP_MS = 40;
const ENTER_STAGGER_MAX_DELAY_MS = 200;

interface RecentPostCardListProps {
  boardId: string;
  onPostClick: (postId: string) => void;
  onClickProfile?: (userId: string) => void;
}

interface PostCardEntry {
  post: Post;
  isEntering: boolean;
  staggerDelayMs: number;
}

function toStaggerDelayMs(indexInPage: number): number {
  return Math.min(indexInPage * ENTER_STAGGER_STEP_MS, ENTER_STAGGER_MAX_DELAY_MS);
}

function toPostCardEntries(pages: Post[][], baselinePageCount: number): PostCardEntry[] {
  return pages.flatMap((page, pageIndex) => {
    const isEntering = pageIndex >= baselinePageCount;
    return page.map((post, indexInPage) => ({
      post,
      isEntering,
      staggerDelayMs: isEntering ? toStaggerDelayMs(indexInPage) : 0,
    }));
  });
}

/**
 * Freezes how many pages were present when data first arrived, so only pages
 * fetched after that animate in. Assigned during render as a lazy init, which
 * keeps the baseline independent of commit timing.
 */
function useBaselinePageCount(pageCount: number): number {
  const baselineRef = useRef<number | null>(null);
  if (baselineRef.current === null && pageCount > 0) {
    baselineRef.current = pageCount;
  }
  return baselineRef.current ?? pageCount;
}

function LoadingSkeletons() {
  return (
    <div className='space-y-6'>
      {Array.from({ length: LOADING_SKELETON_COUNT }).map((_, index) => (
        <PostCardSkeleton key={index} />
      ))}
    </div>
  );
}

interface EnteringPostCardProps {
  entry: PostCardEntry;
  prefetchedData?: PostCardPrefetchedData;
  isBatchMode: boolean;
  onClick: () => void;
  onClickProfile?: (userId: string) => void;
}

function EnteringPostCard({
  entry: { post, isEntering, staggerDelayMs },
  prefetchedData,
  isBatchMode,
  onClick,
  onClickProfile,
}: EnteringPostCardProps) {
  return (
    <div
      className={isEntering ? 'dwf-content-enter' : undefined}
      style={isEntering ? { animationDelay: `${staggerDelayMs}ms` } : undefined}
    >
      <PostCard
        post={post}
        onClick={onClick}
        onClickProfile={onClickProfile}
        prefetchedData={prefetchedData}
        isBatchMode={isBatchMode}
      />
    </div>
  );
}

function LoadErrorMessage() {
  return (
    <StatusMessage
      error
      errorMessage='글을 불러오는 중에 문제가 생겼어요. 잠시 후 다시 시도해주세요.'
    />
  );
}

function LoadingMoreIndicator() {
  return (
    <div className='text-reading-sm flex items-center justify-center p-6 text-muted-foreground'>
      <span>글을 불러오는 중...</span>
    </div>
  );
}

function EmptyBoardMessage({ onWritePost }: { onWritePost: () => void }) {
  return (
    <div className='flex flex-col items-center justify-start p-8 pt-16 text-center'>
      <div className='mb-4 text-6xl text-muted-foreground'>텅~</div>
      <div className='mb-6 text-muted-foreground'>게시판이 비어있어요</div>
      <h3 className='mb-6 text-lg font-semibold text-foreground'>
        첫 글의 주인공이 되어 볼까요?
      </h3>
      <Button onClick={onWritePost} className='flex items-center gap-2'>
        <PenSquare className='size-4' />
        글 쓰러 가기
      </Button>
    </div>
  );
}

function useRecentPostCardEntries(boardId: string) {
  const [inViewRef, isSentinelInView] = useInView();
  const {
    data: postPages,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useRecentPosts(boardId, POSTS_PER_PAGE);

  const pages = postPages?.pages ?? [];
  const { data: prefetchedByAuthorId, isError: isBatchError } = useBatchPostCardData(pages);
  const baselinePageCount = useBaselinePageCount(pages.length);

  useEffect(() => {
    if (isSentinelInView && hasNextPage) {
      fetchNextPage();
    }
  }, [isSentinelInView, hasNextPage, fetchNextPage]);

  return {
    cardEntries: toPostCardEntries(pages, baselinePageCount),
    prefetchedByAuthorId,
    isBatchMode: !isBatchError,
    isLoading,
    isError,
    isFetchingNextPage,
    inViewRef,
  };
}

const RecentPostCardList: React.FC<RecentPostCardListProps> = ({ boardId, onPostClick, onClickProfile }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  usePerformanceMonitoring('RecentPostCardList');

  const {
    cardEntries,
    prefetchedByAuthorId,
    isBatchMode,
    isLoading,
    isError,
    isFetchingNextPage,
    inViewRef,
  } = useRecentPostCardEntries(boardId);

  const handleRefreshPosts = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    queryClient.invalidateQueries(['posts', boardId]);
  }, [boardId, queryClient]);

  useRegisterTabHandler('Home', handleRefreshPosts);

  const handlePostClick = (post: Post) => {
    seedPostCache(queryClient, post);
    onPostClick(post.id);
  };

  if (isLoading) return <LoadingSkeletons />;
  if (isError) return <LoadErrorMessage />;
  if (cardEntries.length === 0) {
    return <EmptyBoardMessage onWritePost={() => navigate(`/create/${boardId}`)} />;
  }

  return (
    <div className='space-y-4'>
      {cardEntries.map((entry) => (
        <EnteringPostCard
          key={entry.post.id}
          entry={entry}
          prefetchedData={prefetchedByAuthorId.get(entry.post.authorId)}
          isBatchMode={isBatchMode}
          onClick={() => handlePostClick(entry.post)}
          onClickProfile={onClickProfile}
        />
      ))}
      <div ref={inViewRef} />
      {isFetchingNextPage && <LoadingMoreIndicator />}
    </div>
  );
};

export default RecentPostCardList;
