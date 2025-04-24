import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import AuthorList from './AuthorList';
import BoardHeader from './BoardHeader';
import PostCardList from './PostCardList';
import { WritingActionButton } from './WritingActionButton';
import { Button } from '@/components/ui/button';

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

  const handlePostClick = (postId: string) => {
    navigate(`/board/${boardId}/post/${postId}`);
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
      <WritingActionButton boardId={boardId} />
    </div>
  );
}
