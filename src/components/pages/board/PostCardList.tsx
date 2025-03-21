import React, { useEffect, useState } from 'react';
import PostCard from '../post/PostCard';
import StatusMessage from '../../common/StatusMessage';
import { usePosts } from '@/hooks/usePosts';
import { useInView } from 'react-intersection-observer';
import PostCardSkeleton from '@/components/ui/PostCardSkeleton';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

interface PostCardListProps {
  boardId: string;
  onPostClick: (postId: string) => void;
  selectedAuthorId: string | null;
}

const PostCardList: React.FC<PostCardListProps> = ({ boardId, onPostClick, selectedAuthorId }) => {
  const [inViewRef, inView] = useInView();
  const [limitCount] = useState(7);
  const isOnline = useOnlineStatus();
  usePerformanceMonitoring('PostCardList');

  const {
    data: postPages,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = usePosts(boardId, selectedAuthorId, limitCount);

  const allPosts = postPages?.pages.flatMap((page) => page) || [];

  const { saveScrollPosition, restoreScrollPosition } = useScrollRestoration(`${boardId}-posts`);

  const handlePostClick = (postId: string) => {
    onPostClick(postId);
    saveScrollPosition();
  };

  // 네트워크 상태가 변경될 때 데이터 새로고침
  useEffect(() => {
    if (isOnline) {
      refetch();
    }
  }, [isOnline, refetch]);

  // 무한 스크롤 처리
  useEffect(() => {
    if (inView && hasNextPage && isOnline) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage, isOnline]);

  // 스크롤 위치 복원
  useEffect(() => {
    if (boardId) {
      restoreScrollPosition();
    }
  }, [boardId, restoreScrollPosition]);

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
    // 오프라인 상태에서 에러가 발생한 경우 특별한 메시지 표시
    if (!isOnline) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <WifiOff className="size-12 text-amber-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
            오프라인 상태입니다
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            인터넷 연결이 없으며 이 게시판의 캐시된 데이터가 없습니다. 
            인터넷에 연결되면 자동으로 새로고침됩니다.
          </p>
        </div>
      );
    }
    
    return (
      <StatusMessage 
        error 
        errorMessage="글을 불러오는 중에 문제가 생겼어요. 잠시 후 다시 시도해주세요." 
      />
    );
  }

  if (allPosts.length === 0) {
    return <StatusMessage error errorMessage="글이 하나도 없어요." />;
  }

  return (
    <div className='space-y-6'>
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md mb-4 flex items-center">
          <WifiOff className="size-4 text-amber-600 dark:text-amber-400 mr-2" />
          <p className="text-amber-600 dark:text-amber-400 text-sm">
            오프라인 모드: 캐시된 게시물만 표시됩니다
          </p>
        </div>
      )}
      
      {allPosts.map((post) => (
        <PostCard 
          key={post.id} 
          post={post} 
          onClick={() => handlePostClick(post.id)} 
        />
      ))}
      
      {isOnline && (
        <div ref={inViewRef} />
      )}
      
      {isFetchingNextPage && isOnline && (
        <div className="flex justify-center items-center p-4">
          <span>글을 불러오는 중...</span>
        </div>
      )}
    </div>
  );
};

export default PostCardList;