import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

import AuthorList from './AuthorList';
import BoardHeader from './BoardHeader';
import PostCardList from './PostCardList';
import { Button } from '../../ui/button';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const { saveScrollPosition } = useScrollRestoration({
    key: boardId || '',
    enabled: !!boardId
  });

  const handlePostClick = (postId: string) => {
    saveScrollPosition();
    navigate(`/post/${postId}`);
  };

  const handleAuthorSelect = (authorId: string) => {
    setSelectedAuthorId(authorId === selectedAuthorId ? null : authorId);
  };

  if (!boardId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">게시판을 찾을 수 없습니다.</h1>
          <p className="mt-4 text-lg text-muted-foreground">존재하지 않는 게시판이거나 잘못된 경로입니다.</p>
          <Button
            onClick={() => navigate('/')}
            className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

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
