import React, { useEffect, useState } from 'react';
import { firestore } from '../../../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  DocumentData,
  QueryDocumentSnapshot,
  where,
} from 'firebase/firestore';
import { Post } from '../../../types/Posts';
import PostSummaryCard from '../post/PostSummaryCard';

interface PostListProps {
  boardId: string;
  onPostClick: (postId: string) => void;
}

const PostList: React.FC<PostListProps> = ({ boardId, onPostClick }) => {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!boardId) {
      console.error('No boardId provided');
      return;
    }

    const q = query(
      collection(firestore, 'posts'),
      where('boardId', '==', boardId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData: Post[] = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        return {
          id: doc.id,
          boardId: data.boardId,
          title: data.title,
          content: data.content,
          authorId: data.authorId,
          authorName: data.authorName,
          createdAt: data.createdAt?.toDate() || new Date(),
          comments: data.comments || 0,
        };
      });
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, [boardId]);

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostSummaryCard key={post.id} post={post} onClick={() => onPostClick(post.id)} />
      ))}
    </div>
  );
};

export default PostList;
