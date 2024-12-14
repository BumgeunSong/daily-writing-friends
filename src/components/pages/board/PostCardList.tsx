import React, { useEffect, useState } from 'react';
import PostCard from '../post/PostCard';
import StatusMessage from '../../common/StatusMessage';
import { usePosts } from '@/hooks/usePosts';
import { useInView } from 'react-intersection-observer';
import { Skeleton } from '@/components/ui/skeleton';
import PostCardSkeleton from '@/components/ui/PostCardSkeleton';

interface PostCardListProps {
  boardId: string;
  onPostClick: (postId: string) => void;
  selectedAuthorId: string | null;
}

const PostCardList: React.FC<PostCardListProps> = ({ boardId, onPostClick, selectedAuthorId }) => {
  const [inViewRef, inView] = useInView();
  const [limitCount] = useState(7);

  const {
    data: postPages,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePosts(boardId, selectedAuthorId, limitCount);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

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

  const allPosts = postPages?.pages.flatMap((page) => page) || [];

  if (allPosts.length === 0) {
    return <StatusMessage error errorMessage="글이 하나도 없어요." />;
  }

  return (
    <div className='space-y-6'>
      {allPosts.map((post) => (
        <PostCard key={post.id} post={post} onClick={() => onPostClick(post.id)} />
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