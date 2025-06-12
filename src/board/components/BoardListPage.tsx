// src/components/Pages/BoardListPage.tsx
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Link } from 'react-router-dom';
import { Board } from '@/board/model/Board';
import { fetchBoardsWithUserPermissions } from '@/board/utils/boardUtils';
import StatusMessage from '@/shared/components/StatusMessage';
import { useAuth } from '@/shared/hooks/useAuth';

const BoardListPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { data: boards = [], isLoading, error } = useQuery<Board[]>(
    ['boards', currentUser?.uid],
    () => fetchBoardsWithUserPermissions(currentUser!.uid),
    {
      enabled: !!currentUser, // currentUser가 있을 때만 쿼리 실행
      staleTime: 1000 * 60 * 5, // 5분 동안 데이터가 신선하다고 간주
      cacheTime: 1000 * 60 * 30, // 10분 동안 캐시 유지
      select: (data) => {
        // 코호트 순으로 정렬
        return [...data].sort((a, b) => {
          // cohort가 없는 경우 맨 뒤로
          if (!a.cohort) return 1;
          if (!b.cohort) return -1;
          return a.cohort - b.cohort;
        });
      },
    }
  );

  const handleBoardClick = (boardId: string) => {
    localStorage.setItem('boardId', boardId);
  };

  if (isLoading) {
    return <StatusMessage isLoading loadingMessage="게시판을 불러오는 중..." />;
  }

  if (error) {
    return <StatusMessage error errorMessage="게시판을 불러오는 중에 문제가 생겼어요. 잠시 후 다시 시도해주세요." />;
  }

  return (
    <div className='min-h-screen bg-background'>
      <header className="bg-background py-3">
        <div className="container mx-auto flex items-center justify-between px-3 md:px-4">
          <div className="flex items-center space-x-2 rounded-lg p-2 min-h-[44px]">
            <span className='text-xl font-semibold tracking-tight md:text-2xl text-foreground'>어디로 들어갈까요?</span>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-3 md:px-4 py-2">
        {boards.length === 0 ? (
          <div className='text-center py-8'>
            <p className="text-muted-foreground text-reading">아직 초대받은 게시판이 없어요. 관리자에게 문의해주세요. 😔</p>
          </div>
        ) : (
          <div className='space-y-4'>
            {boards.map((board) => (
              <Link
                to={`/board/${board.id}`}
                onClick={() => handleBoardClick(board.id)}
                key={board.id}
                className="block reading-focus"
              >
                <div className='bg-card reading-shadow border border-border/50 rounded-lg p-4 reading-hover active:scale-[0.99] transition-all duration-200'>
                  <h2 className='text-lg font-semibold text-foreground mb-1'>{board.title}</h2>
                  <p className='text-muted-foreground text-reading text-sm'>{board.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default BoardListPage;
