'use client';

import { useQueryClient } from '@tanstack/react-query';
import type React from 'react';
import { useEffect, useState, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import { PenSquare } from 'lucide-react';
import { useScrollRestoration } from '@/post/hooks/useScrollRestoration';
import StatusMessage from '@/shared/components/StatusMessage';
import { useRegisterTabHandler } from '@/shared/contexts/BottomTabHandlerContext';
import { usePerformanceMonitoring } from '@/shared/hooks/usePerformanceMonitoring';
import PostCardSkeleton from '@/shared/ui/PostCardSkeleton';
import PostCard from '@/post/components/PostCard';
import { usePosts } from '@/post/hooks/usePosts';
import { useCurrentUserKnownBuddy } from '@/user/hooks/useCurrentUserKnownBuddy';
import { Button } from '@/shared/ui/button';

interface PostCardListProps {
  boardId: string;
  onPostClick: (postId: string) => void;
  onClickProfile?: (userId: string) => void;
}

/**
 * 게시글 목록 컴포넌트 (내 컨텐츠 숨김 유저 필터링)
 */
const PostCardList: React.FC<PostCardListProps> = ({ boardId, onPostClick, onClickProfile }) => {
  const [inViewRef, inView] = useInView();
  const [limitCount] = useState(7);
  usePerformanceMonitoring('PostCardList');
  const queryClient = useQueryClient();
  const { knownBuddy } = useCurrentUserKnownBuddy();
  const navigate = useNavigate();

  const {
    data: postPages,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePosts(boardId, limitCount);

  const allPosts = postPages?.pages.flat() || [];

  const { saveScrollPosition, restoreScrollPosition } = useScrollRestoration(`${boardId}-posts`);

  const handleRefreshPosts = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    queryClient.invalidateQueries(['posts', boardId]);
  }, [boardId, queryClient]);

  // 홈 탭 핸들러 등록
  useRegisterTabHandler('Home', handleRefreshPosts);

  const handlePostClick = (postId: string) => {
    onPostClick(postId);
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
  }, [boardId]);

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
      <div className="flex flex-col items-center justify-start p-8 text-center pt-16">
        <div className="text-6xl mb-4 text-muted-foreground">
          텅~
        </div>
        <div className="text-muted-foreground mb-6">게시판이 비어있어요</div>
        <h3 className="text-lg font-semibold text-foreground mb-6">
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
      {allPosts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onClick={() => handlePostClick(post.id)}
          onClickProfile={onClickProfile}
          isKnownBuddy={post.authorId === knownBuddy?.uid}
        />
      ))}
      <div ref={inViewRef} />
      {isFetchingNextPage && (
        <div className='flex items-center justify-center p-6 text-muted-foreground text-reading-sm'>
          <span>글을 불러오는 중...</span>
        </div>
      )}
    </div>
  );
};

export default PostCardList;
