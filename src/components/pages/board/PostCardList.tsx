import React, { useEffect, useState, useCallback } from 'react';
import PostCard from '../post/PostCard';
import StatusMessage from '../../common/StatusMessage';
import { usePosts } from '@/hooks/usePosts';
import { useInView } from 'react-intersection-observer';
import PostCardSkeleton from '@/components/ui/PostCardSkeleton';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useRegisterTabHandler } from '@/contexts/BottomTabHandlerContext';
import { useQueryClient } from '@tanstack/react-query';

interface PostCardListProps {
  boardId: string;
  onPostClick: (postId: string) => void;
  selectedAuthorId: string | null;
}

const PostCardList: React.FC<PostCardListProps> = ({ boardId, onPostClick, selectedAuthorId }) => {
  const [inViewRef, inView] = useInView();
  const [limitCount] = useState(7);
  usePerformanceMonitoring('PostCardList')
  const queryClient = useQueryClient();

  const {
    data: postPages,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = usePosts(boardId, selectedAuthorId, limitCount);

  const allPosts = postPages?.pages.flatMap((page) => page) || [];

  const { saveScrollPosition, restoreScrollPosition } = useScrollRestoration(`${boardId}-posts`);

  const handleRefreshPosts = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    queryClient.invalidateQueries(['posts', boardId, selectedAuthorId]);
  }, [boardId, queryClient, selectedAuthorId]);

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
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (isError) {
    return <StatusMessage error errorMessage="글을 불러오는 중에 문제가 생겼어요. 잠시 후 다시 시도해주세요." />;
  }

  if (allPosts.length === 0) {
    return <StatusMessage error errorMessage="글이 하나도 없어요." />;
  }

  return (
    <div className='space-y-6'>
      {allPosts.map((post) => (
        <PostCard 
          key={post.id} 
          post={post} 
          onClick={() => handlePostClick(post.id)} 
        />
      ))}
      <div ref={inViewRef} />
      {isFetchingNextPage && (
        <div className="flex justify-center items-center p-4">
          <span>글을 불러오는 중...</span>
        </div>
      )}
    </div>
  );
};

export default PostCardList;