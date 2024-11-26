import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchPosts } from '@/utils/postUtils';
import { Post } from '../../../types/Posts';
import PostSummaryCard from '../post/PostSummaryCard';
import StatusMessage from '../../common/StatusMessage';

interface PostListProps {
  boardId: string;
  onPostClick: (postId: string) => void;
  selectedAuthorId: string | null;
}

const PostList: React.FC<PostListProps> = ({ boardId, onPostClick, selectedAuthorId }) => {
  const { data: posts = [], isLoading, error } = useQuery<Post[]>(
    ['posts', boardId, selectedAuthorId],
    () => fetchPosts(boardId, selectedAuthorId),
    {
      enabled: !!boardId,
    }
  );

  if (isLoading) {
    return <StatusMessage isLoading loadingMessage="글을 불러오는 중..." />;
  }

  if (error) {
    return <StatusMessage error errorMessage="글을 불러오는 중에 문제가 생겼어요. 잠시 후 다시 시도해주세요." />;
  }

  if (posts.length === 0) {
    return <StatusMessage error errorMessage="글이 하나도 없어요." />;
  }

  return (
    <div className='space-y-6'>
      {posts.map((post) => (
        <PostSummaryCard key={post.id} post={post} onClick={() => onPostClick(post.id)} />
      ))}
    </div>
  );
};

export default PostList;

