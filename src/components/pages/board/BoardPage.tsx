import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

import AuthorList from './AuthorList';
import BoardHeader from './BoardHeader';
import PostCardList from './PostCardList';
import { Button } from '../../ui/button';

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

  useEffect(() => {
    if (!boardId) {
      console.error('No boardId provided');
      return;
    }

    try {
      const savedScrollPosition = sessionStorage.getItem(`scrollPosition-${boardId}`);
      if (savedScrollPosition) {
        window.requestAnimationFrame(() => {
          try {
            window.scrollTo({
              top: parseInt(savedScrollPosition, 10),
              behavior: 'instant'
            });
          } catch (error) {
            console.error('Scroll restoration failed:', error);
          }
        });
      }
    } catch (error) {
      console.error('Session storage access failed:', error);
    }

    return () => {
      try {
        sessionStorage.setItem(`scrollPosition-${boardId}`, window.scrollY.toString());
      } catch (error) {
        console.error('Failed to save scroll position:', error);
      }
    };
  }, [boardId]);

  const handlePostClick = (postId: string) => {
    // Save scroll position before navigating
    sessionStorage.setItem(`scrollPosition-${boardId}`, window.scrollY.toString());
    navigate(`/post/${postId}`);
  };

  const handleAuthorSelect = (authorId: string) => {
    setSelectedAuthorId(authorId === selectedAuthorId ? null : authorId);
  };

  return (
    <div className='min-h-screen bg-background'>
      <BoardHeader boardId={boardId} />
      <main className='container mx-auto px-4 py-8 pb-24'>
        <div className='mb-6'>
          {boardId && <AuthorList boardId={boardId} onAuthorSelect={handleAuthorSelect} />}
        </div>
        <PostCardList
          boardId={boardId!}
          onPostClick={handlePostClick}
          selectedAuthorId={selectedAuthorId}
        />
      </main>
      <Link
        to={`/create/${boardId}`}
        className='fixed bottom-20 right-4 z-10 rounded-full shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
      >
        <Button
          size='icon'
          className='size-12 rounded-full bg-primary text-primary-foreground shadow-lg'
          aria-label='Create Post'
        >
          <Plus className='size-5' />
        </Button>
      </Link>
    </div>
  );
}
