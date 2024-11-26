import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchPosts } from '@/utils/postUtils';
import { Post } from '../../../types/Posts';
import PostSummaryCard from '../post/PostSummaryCard';

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
      enabled: !!boardId, // boardId가 있을 때만 쿼리 실행
    }
  );

  if (isLoading) {
    return <div>Loading posts...</div>;
  }

  if (error) {
    return <div>Error loading posts. Please try again later.</div>;
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
