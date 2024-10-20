// src/components/FeedPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { Post } from '../../types/Posts';

const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(firestore, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData: Post[] = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          content: data.content,
          authorId: data.authorId,
          authorName: data.authorName,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
        };
      });
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, []);

  const getFirstFiveLines = (text: string) => {
    return text.split('\n').slice(0, 5).join('\n');
  };

  return (
    <div>
      <h1>Feed</h1>
      {posts.map((post) => (
        <div key={post.id} onClick={() => navigate(`/post/${post.id}`)}>
          <h2>{post.title}</h2>
          <p>{getFirstFiveLines(post.content)}</p>
          <p>
            By {post.authorName} on {post.createdAt.toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
};

export default FeedPage;
