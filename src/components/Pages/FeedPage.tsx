// src/components/FeedPage.tsx
import React, { useEffect, useState } from 'react';
import { firestore } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { Post } from '../../types/Posts';
import PostCard from './PostCard';
import AppHeader from './AppHeader';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';

const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);

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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/create">
            <Button 
              size="lg"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200 shadow-lg text-lg py-6 rounded-lg"
            >
              <PlusCircle className="mr-2 h-6 w-6" />
              글 쓰러 가기
            </Button>
          </Link>
        </div>
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post}/>
          ))}
        </div>
      </main>
    </div>
  )
};

export default FeedPage;
