// src/components/BoardPage.tsx
import React, { useEffect, useState } from 'react';
import { firestore } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot, DocumentData, QueryDocumentSnapshot, where, doc, getDoc } from 'firebase/firestore';
import { Post } from '../../types/Posts';
import PostCard from './PostCard';
import BoardHeader from './AppHeader';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';

const BoardPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [boardTitle, setBoardTitle] = useState<string>('');

  useEffect(() => {
    if (!boardId) {
      console.error('No boardId provided');
      return;
    }

    // Fetch board title
    const fetchBoardTitle = async () => {
      try {
        const boardDocRef = doc(firestore, 'boards', boardId);
        const boardDoc = await getDoc(boardDocRef);
        if (boardDoc.exists()) {
          const boardData = boardDoc.data();
          setBoardTitle(boardData?.title || 'Board');
        } else {
          console.error('Board not found');
        }
      } catch (error) {
        console.error('Error fetching board title:', error);
      }
    };

    fetchBoardTitle();

    const q = query(
      collection(firestore, 'posts'),
      where('boardId', '==', boardId),
      orderBy('createdAt', 'desc'),
      limit(10)
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
          updatedAt: data.updatedAt?.toDate(),
        };
      });
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <BoardHeader title={ boardTitle }/>
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

export default BoardPage;
