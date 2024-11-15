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
  Query,
} from 'firebase/firestore';
import { Post } from '../../../types/Posts';
import PostSummaryCard from '../post/PostSummaryCard';

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

    let q: Query<DocumentData> = query(
      collection(firestore, 'posts'),
      where('boardId', '==', boardId),
      orderBy('createdAt', 'desc')
    );

    if (selectedAuthorId) {
      q = query(q, where('authorId', '==', selectedAuthorId));
    }

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