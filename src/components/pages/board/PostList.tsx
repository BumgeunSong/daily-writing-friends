import React, { useEffect, useState } from 'react';
import { Post } from '../../../types/Posts';
import PostSummaryCard from '../post/PostSummaryCard';
import { fetchPosts } from '@/utils/postUtils';

interface PostListProps {
  boardId: string;
  onPostClick: (postId: string) => void;
  selectedAuthorId: string | null;
}

const PostList: React.FC<PostListProps> = ({ boardId, onPostClick, selectedAuthorId }) => {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!boardId) {
      console.error('No boardId provided');
      return;
    }

    const unsubscribe = fetchPosts(boardId, selectedAuthorId, setPosts);

    return () => unsubscribe();
  }, [boardId, selectedAuthorId]);

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostSummaryCard key={post.id} post={post} onClick={() => onPostClick(post.id)} />
      ))}
    </div>
  );
};

export default PostList;