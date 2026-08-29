'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import PostCard from '@/post/components/PostCard';
import { useBatchPostCardData } from '@/post/hooks/useBatchPostCardData';
import { useBestPosts } from '@/post/hooks/useBestPosts';
import type { Post } from '@/post/model/Post';
import { seedPostCache } from '@/post/utils/postCacheUtils';
import StatusMessage from '@/shared/components/StatusMessage';
import { useRegisterTabHandler } from '@/shared/contexts/BottomTabHandlerContext';
import { usePerformanceMonitoring } from '@/shared/hooks/usePerformanceMonitoring';
import PostCardSkeleton from '@/shared/ui/PostCardSkeleton';
import type React from 'react';

const BEST_POSTS_TARGET = 20;
const LOADING_SKELETON_COUNT = 5;

interface BestPostCardListProps {
  boardId: string;
  onPostClick: (postId: string) => void;
  onClickProfile?: (userId: string) => void;
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

function EmptyBestPostsMessage() {
  return (
    <div className='flex flex-col items-center justify-start p-8 pt-16 text-center'>
      <div className='mb-4 text-6xl text-muted-foreground'>~</div>
      <div className='mb-6 text-muted-foreground'>최근 7일간 베스트 글이 없어요</div>
    </div>
  );
}

/** 최근 7일 베스트 게시글 목록 (engagementScore 내림차순) */
const BestPostCardList: React.FC<BestPostCardListProps> = ({ boardId, onPostClick, onClickProfile }) => {
  usePerformanceMonitoring('BestPostCardList');
  const queryClient = useQueryClient();

  const {
    recentPosts,
    recentPostPages,
    isLoading,
    isError,
    isFetchingNextPage,
  } = useBestPosts(boardId, BEST_POSTS_TARGET);

  const { data: prefetchedByAuthorId, isError: isBatchError } = useBatchPostCardData(recentPostPages);

  const handleRefreshPosts = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    queryClient.invalidateQueries(['bestPosts', boardId]);
  }, [boardId, queryClient]);

  useRegisterTabHandler('Home', handleRefreshPosts);

  const handlePostClick = (post: Post) => {
    seedPostCache(queryClient, post);
    onPostClick(post.id);
  };

  if (isLoading) return <LoadingSkeletons />;

  if (isError) {
    return (
      <StatusMessage
        error
        errorMessage='글을 불러오는 중에 문제가 생겼어요. 잠시 후 다시 시도해주세요.'
      />
    );
  }

  const isSettledAndEmpty = recentPosts.length === 0 && !isFetchingNextPage;
  if (isSettledAndEmpty) return <EmptyBestPostsMessage />;

  return (
    <div className='space-y-4'>
      {recentPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onClick={() => handlePostClick(post)}
          onClickProfile={onClickProfile}
          prefetchedData={prefetchedByAuthorId.get(post.authorId)}
          isBatchMode={recentPosts.length > 0 && !isBatchError}
        />
      ))}
      {isFetchingNextPage && (
        <div className='text-reading-sm flex items-center justify-center p-6 text-muted-foreground'>
          <span>글을 불러오는 중...</span>
        </div>
      )}
    </div>
  );
};

export default BestPostCardList;
