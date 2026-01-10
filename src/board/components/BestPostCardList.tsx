'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import PostCard from '@/post/components/PostCard';
import { useBestPosts } from '@/post/hooks/useBestPosts';
import { useScrollRestoration } from '@/post/hooks/useScrollRestoration';
import StatusMessage from '@/shared/components/StatusMessage';
import { useRegisterTabHandler } from '@/shared/contexts/BottomTabHandlerContext';
import { usePerformanceMonitoring } from '@/shared/hooks/usePerformanceMonitoring';
import PostCardSkeleton from '@/shared/ui/PostCardSkeleton';
import { useCurrentUserKnownBuddy } from '@/user/hooks/useCurrentUserKnownBuddy';
import type React from 'react';

const BEST_POSTS_TARGET = 20;

interface BestPostCardListProps {
  boardId: string;
  onPostClick: (postId: string) => void;
  onClickProfile?: (userId: string) => void;
}

/**
 * 베스트 게시글 목록 컴포넌트 (최근 7일, engagementScore 내림차순)
 */
const BestPostCardList: React.FC<BestPostCardListProps> = ({ boardId, onPostClick, onClickProfile }) => {
  usePerformanceMonitoring('BestPostCardList');
  const queryClient = useQueryClient();
  const { knownBuddy } = useCurrentUserKnownBuddy();

  const {
    recentPosts,
    isLoading,
    isError,
    isFetchingNextPage,
  } = useBestPosts(boardId, BEST_POSTS_TARGET);

  const { saveScrollPosition, restoreScrollPosition } = useScrollRestoration(`${boardId}-best-posts`);

  const handleRefreshPosts = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    queryClient.invalidateQueries(['bestPosts', boardId]);
  }, [boardId, queryClient]);

  useRegisterTabHandler('Home', handleRefreshPosts);

  const handlePostClick = (postId: string) => {
    onPostClick(postId);
    saveScrollPosition();
  };

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

  if (recentPosts.length === 0 && !isFetchingNextPage) {
    return (
      <div className="flex flex-col items-center justify-start p-8 pt-16 text-center">
        <div className="mb-4 text-6xl text-muted-foreground">
          ~
        </div>
        <div className="mb-6 text-muted-foreground">최근 7일간 베스트 글이 없어요</div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {recentPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onClick={() => handlePostClick(post.id)}
          onClickProfile={onClickProfile}
          isKnownBuddy={post.authorId === knownBuddy?.uid}
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
